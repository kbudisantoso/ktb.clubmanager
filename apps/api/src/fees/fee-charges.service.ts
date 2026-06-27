import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../../../../prisma/generated/client/index.js';
import type { BillingRunPreviewDto } from './dto/billing-run-preview.dto.js';
import type { BillingRunConfirmDto } from './dto/billing-run-confirm.dto.js';
import type { FeeChargeQueryDto } from './dto/fee-charge-query.dto.js';

// Explicit rounding strategy for all money calculations.
// HALF_UP rounds halves away from zero (0.5 -> 1). This is NOT banker's rounding,
// which is HALF_EVEN (rounds halves to the nearest even digit).
const ROUNDING_MODE = Prisma.Decimal.ROUND_HALF_UP;
const DECIMAL_PLACES = 2;

function roundMoney(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(DECIMAL_PLACES, ROUNDING_MODE);
}

const ZERO = new Prisma.Decimal(0);

/** Warning for members excluded from billing */
export interface BillingWarning {
  memberId: string;
  memberName: string;
  reason: string;
}

/** Charge data prepared from billing calculation */
interface ChargeData {
  clubId: string;
  memberId: string;
  feeCategoryId: string | null;
  membershipTypeId: string | null;
  feeTypeId: string | null;
  description: string;
  periodStart: Date;
  periodEnd: Date;
  amount: Prisma.Decimal;
  dueDate: Date;
  discountAmount: Prisma.Decimal | null;
  discountReason: string | null;
}

/** Breakdown entry per membership type or category for preview */
interface BreakdownEntry {
  /** Distinguishes base-fee rows (membership type) from category rows so identically named entries do not merge */
  kind: 'membershipType' | 'category';
  /** Display name: the membership type name for base fees, the category name for category rows */
  membershipType: string;
  count: number;
  subtotal: Prisma.Decimal;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MemberWithRelations = any;

@Injectable()
export class FeeChargesService {
  constructor(private prisma: PrismaService) {}

  // ─── Billing Run: Preview ───────────────────────────────────────────

  /**
   * Preview billing run without side effects.
   * Calculates what each active member owes for the specified period.
   */
  async previewBillingRun(clubId: string, dto: BillingRunPreviewDto) {
    if (new Date(dto.periodStart) >= new Date(dto.periodEnd)) {
      throw new BadRequestException('Periodenbeginn muss vor dem Periodenende liegen');
    }

    const { charges, exemptions, warnings, breakdown } = await this.calculateBillingCharges(
      clubId,
      dto
    );

    // Check for existing charges for duplicate detection
    const db = this.prisma.forClub(clubId);
    const existingCharges = await db.feeCharge.count({
      where: {
        deletedAt: null,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
      },
    });

    const totalAmount = charges.reduce((sum, c) => sum.plus(c.amount), ZERO);
    const uniqueMembers = new Set(charges.map((c) => c.memberId)).size;

    return {
      memberCount: uniqueMembers,
      chargeCount: charges.length,
      totalAmount: roundMoney(totalAmount).toFixed(DECIMAL_PLACES),
      exemptions,
      warnings,
      breakdown: breakdown.map((b) => ({
        kind: b.kind,
        membershipType: b.membershipType,
        count: b.count,
        subtotal: roundMoney(b.subtotal).toFixed(DECIMAL_PLACES),
      })),
      existingCharges,
    };
  }

  // ─── Billing Run: Execute ───────────────────────────────────────────

  /**
   * Execute billing run and create FeeCharge records in a transaction.
   * Uses createMany with skipDuplicates for idempotency.
   */
  async executeBillingRun(clubId: string, dto: BillingRunConfirmDto) {
    if (new Date(dto.periodStart) >= new Date(dto.periodEnd)) {
      throw new BadRequestException('Periodenbeginn muss vor dem Periodenende liegen');
    }

    const { charges } = await this.calculateBillingCharges(clubId, dto);

    const chargeDataArray: ChargeData[] = charges.map((c) => ({
      ...c,
      dueDate: new Date(dto.dueDate),
    }));

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    // Run the re-billing guard and the insert in one Serializable transaction so a
    // concurrent run cannot slip charges in between the count check and createMany;
    // the partial unique index (deletedAt IS NULL, NULLS NOT DISTINCT) is the hard
    // backstop. totalAmount is summed from the charges actually persisted, so a
    // skipDuplicates skip can never make it diverge from chargesCreated. clubId is
    // filtered explicitly because tx is not club-scoped (no forClub on the tx client).
    const result = await this.prisma.$transaction(
      async (tx: {
        feeCharge: {
          count: (args: {
            where: { clubId: string; deletedAt: null; periodStart: Date; periodEnd: Date };
          }) => Promise<number>;
          createMany: (args: {
            data: ChargeData[];
            skipDuplicates: boolean;
          }) => Promise<{ count: number }>;
          findMany: (args: {
            where: { clubId: string; deletedAt: null; periodStart: Date; periodEnd: Date };
            select: { amount: true };
          }) => Promise<{ amount: Prisma.Decimal }[]>;
        };
      }) => {
        const existing = await tx.feeCharge.count({
          where: { clubId, deletedAt: null, periodStart, periodEnd },
        });
        if (existing > 0) {
          throw new ConflictException(
            'Für diesen Zeitraum wurden bereits Beiträge berechnet. Bitte storniere die vorhandenen Beiträge, bevor du erneut abrechnest.'
          );
        }

        const created = await tx.feeCharge.createMany({
          data: chargeDataArray,
          skipDuplicates: true,
        });

        const persisted = await tx.feeCharge.findMany({
          where: { clubId, deletedAt: null, periodStart, periodEnd },
          select: { amount: true },
        });
        const totalAmount = persisted.reduce((sum, c) => sum.plus(c.amount), ZERO);

        return {
          chargesCreated: created.count,
          totalAmount: roundMoney(totalAmount).toFixed(DECIMAL_PLACES),
        };
      },
      { isolationLevel: 'Serializable' }
    );

    return result;
  }

  // ─── FeeCharge Queries ──────────────────────────────────────────────

  /**
   * Find all fee charges with computed payment status using SQL-level aggregation.
   * Returns paginated results with OPEN/PARTIAL/PAID status and overdue flag.
   *
   * When a status filter is active, uses a two-pass approach:
   * 1. Fetch all matching charge IDs + amounts (lightweight), compute statuses
   * 2. Filter by status, paginate, then fetch full data for the page
   * This ensures correct `total` and pagination for computed status filters.
   */
  async findAllWithStatus(clubId: string, query: FeeChargeQueryDto) {
    const db = this.prisma.forClub(clubId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // Build filter conditions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      deletedAt: null,
      ...(query.memberId && { memberId: query.memberId }),
      ...(query.periodStart && { periodStart: { gte: new Date(query.periodStart) } }),
      ...(query.periodEnd && { periodEnd: { lte: new Date(query.periodEnd) } }),
    };

    // No status filter: fast single-query path (existing behavior)
    if (!query.status) {
      const skip = (page - 1) * limit;
      const [charges, total] = await Promise.all([
        db.feeCharge.findMany({
          where,
          include: {
            member: {
              select: { id: true, firstName: true, lastName: true, memberNumber: true },
            },
          },
          orderBy: { dueDate: 'desc' },
          skip,
          take: limit,
        }),
        db.feeCharge.count({ where }),
      ]);

      const enrichedCharges = await this.enrichChargesWithStatus(charges);
      return { data: enrichedCharges, total, page, limit };
    }

    // Status filter active: two-pass approach for correct pagination
    // Pass 1: Fetch all charge IDs + amounts (lightweight)
    const allCharges = await db.feeCharge.findMany({
      where,
      select: { id: true, amount: true, dueDate: true },
      orderBy: { dueDate: 'desc' },
    });

    const allChargeIds = allCharges.map((c: { id: string }) => c.id);
    const paymentSumMap = await this.fetchPaymentSums(allChargeIds);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Compute status for each charge and filter
    const filteredIds = allCharges
      .filter((charge: { id: string; amount: Prisma.Decimal | number; dueDate: Date }) => {
        const amount =
          charge.amount instanceof Prisma.Decimal
            ? charge.amount
            : new Prisma.Decimal(String(charge.amount));
        const paidAmount = paymentSumMap.get(charge.id) ?? ZERO;
        const { status, isOverdue } = this.computeChargeStatus(
          amount,
          paidAmount,
          charge.dueDate,
          today
        );

        if (query.status === 'OVERDUE') return isOverdue;
        return status === query.status;
      })
      .map((c: { id: string }) => c.id);

    const filteredTotal = filteredIds.length;

    // Paginate the filtered IDs
    const skip = (page - 1) * limit;
    const pageIds = filteredIds.slice(skip, skip + limit);

    if (pageIds.length === 0) {
      return { data: [], total: filteredTotal, page, limit };
    }

    // Pass 2: Fetch full data for this page only
    const charges = await db.feeCharge.findMany({
      where: { id: { in: pageIds } },
      include: {
        member: {
          select: { id: true, firstName: true, lastName: true, memberNumber: true },
        },
      },
      orderBy: { dueDate: 'desc' },
    });

    const enrichedCharges = await this.enrichChargesWithStatus(charges);
    return { data: enrichedCharges, total: filteredTotal, page, limit };
  }

  // ─── findByMember ───────────────────────────────────────────────────

  /**
   * Find charges for a specific member with computed status.
   * Used for member detail section.
   */
  async findByMember(clubId: string, memberId: string, options?: { limit?: number }) {
    return this.findAllWithStatus(clubId, {
      memberId,
      limit: options?.limit ?? 20,
    });
  }

  // ─── Private: Status Computation Helpers ────────────────────────────

  /**
   * Compute payment status for a single charge.
   */
  private computeChargeStatus(
    amount: Prisma.Decimal,
    paidAmount: Prisma.Decimal,
    dueDate: Date,
    today: Date
  ): { status: string; isOverdue: boolean } {
    const status = paidAmount.gte(amount) ? 'PAID' : paidAmount.gt(ZERO) ? 'PARTIAL' : 'OPEN';
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const isOverdue = status !== 'PAID' && due < today;
    return { status, isOverdue };
  }

  /**
   * Batch-fetch payment sums for a list of charge IDs.
   */
  private async fetchPaymentSums(chargeIds: string[]): Promise<Map<string, Prisma.Decimal>> {
    if (chargeIds.length === 0) return new Map();

    // Tenant-safe: Payment has no clubId and is excluded from the tenant extension by design.
    // This unscoped groupBy is safe because chargeIds always originate from a club-scoped
    // feeCharge query (forClub(clubId)) at every call site, so no cross-tenant payment ids
    // can reach this filter.
    const paymentAggregates = await this.prisma.payment.groupBy({
      by: ['feeChargeId'],
      where: {
        feeChargeId: { in: chargeIds },
        deletedAt: null,
      },
      _sum: { amount: true },
    });

    return new Map(
      paymentAggregates.map(
        (pa: { feeChargeId: string; _sum: { amount: Prisma.Decimal | null } }) => [
          pa.feeChargeId,
          pa._sum.amount ?? ZERO,
        ]
      )
    );
  }

  /**
   * Enrich charge records with computed payment status fields.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async enrichChargesWithStatus(charges: any[]) {
    const chargeIds = charges.map((c: { id: string }) => c.id);
    const paymentSumMap = await this.fetchPaymentSums(chargeIds);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return charges.map((charge) => {
      const paidAmount = paymentSumMap.get(charge.id) ?? ZERO;
      const amount =
        charge.amount instanceof Prisma.Decimal
          ? charge.amount
          : new Prisma.Decimal(String(charge.amount));
      const { status, isOverdue } = this.computeChargeStatus(
        amount,
        paidAmount,
        charge.dueDate,
        today
      );
      const remaining = amount.minus(paidAmount);
      const remainingAmount = remaining.lt(ZERO) ? ZERO : remaining;

      return {
        ...charge,
        amount: amount.toFixed(DECIMAL_PLACES),
        discountAmount: charge.discountAmount
          ? (charge.discountAmount instanceof Prisma.Decimal
              ? charge.discountAmount
              : new Prisma.Decimal(String(charge.discountAmount))
            ).toFixed(DECIMAL_PLACES)
          : null,
        paidAmount: paidAmount.toFixed(DECIMAL_PLACES),
        remainingAmount: roundMoney(remainingAmount).toFixed(DECIMAL_PLACES),
        status,
        isOverdue,
        periodStart:
          charge.periodStart instanceof Date
            ? charge.periodStart.toISOString().split('T')[0]
            : charge.periodStart,
        periodEnd:
          charge.periodEnd instanceof Date
            ? charge.periodEnd.toISOString().split('T')[0]
            : charge.periodEnd,
        dueDate:
          charge.dueDate instanceof Date
            ? charge.dueDate.toISOString().split('T')[0]
            : charge.dueDate,
        createdAt:
          charge.createdAt instanceof Date ? charge.createdAt.toISOString() : charge.createdAt,
        updatedAt:
          charge.updatedAt instanceof Date ? charge.updatedAt.toISOString() : charge.updatedAt,
      };
    });
  }

  // ─── Private: Billing Calculation Logic ─────────────────────────────

  /**
   * Core billing calculation used by both preview and confirm.
   * Returns charge data, exemption count, and breakdown by membership type.
   */
  private async calculateBillingCharges(
    clubId: string,
    dto: BillingRunPreviewDto
  ): Promise<{
    charges: Omit<ChargeData, 'dueDate'>[];
    exemptions: number;
    warnings: BillingWarning[];
    breakdown: BreakdownEntry[];
  }> {
    const db = this.prisma.forClub(clubId);

    // 1. Get club settings
    // NOTE: householdBillingModel is intentionally NOT applied at billing time in this
    // milestone. It currently only drives the FeeType suggestion in the member form.
    // Automatic household-discount application (grouping by householdId, reduced/payer
    // logic, populating discountAmount/discountReason) is deferred to a dedicated future
    // phase, so it is deliberately not added to this select and the billing math is unchanged.
    const club = await this.prisma.club.findFirst({
      where: { id: clubId },
      select: {
        proRataMode: true,
      },
    });

    // 2. Get active members with membership info, fee type, and overrides.
    // NOTE: loaded in one query. For very large clubs this should move to cursor-based
    // batching (compute + insert charges per chunk); deferred as it would restructure
    // the executeBillingRun transaction. The per-member N+1 is already removed via the
    // cross-table map below.
    const members = await this.prisma.member.findMany({
      where: {
        clubId,
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        membershipPeriods: {
          where: { leaveDate: null },
          include: {
            membershipType: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { joinDate: 'desc' },
          take: 1,
        },
        memberFeeOverrides: true,
        feeType: { select: { id: true, name: true } },
      },
    });

    // 3. Get active fee categories matching the billing interval with scope join
    const feeCategories = await db.feeCategory.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        billingInterval: dto.billingInterval,
      },
      include: {
        feeCategoryMembershipTypes: true,
      },
    });

    // 3b. Pre-load the MembershipType x FeeType cross-table for this interval into a
    // map (membershipTypeId:feeTypeId -> entry) so the member loop does a map lookup
    // instead of one findFirst query per member (avoids N+1).
    const crossTableEntries = await db.membershipTypeFeeType.findMany({
      where: { billingInterval: dto.billingInterval },
    });
    const crossTableMap = new Map(
      crossTableEntries.map((e) => [`${e.membershipTypeId}:${e.feeTypeId}`, e])
    );

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    const charges: Omit<ChargeData, 'dueDate'>[] = [];
    const warnings: BillingWarning[] = [];
    let exemptions = 0;
    const breakdownMap = new Map<string, BreakdownEntry>();

    for (const member of members) {
      const currentPeriod = member.membershipPeriods[0];
      if (!currentPeriod?.membershipType) continue;

      const membershipType = currentPeriod.membershipType;
      const baseFeeOverrides = member.memberFeeOverrides.filter(
        (o: MemberWithRelations) => o.isBaseFee && !o.feeCategoryId
      );

      // Check for base fee exemption
      const isExempt = baseFeeOverrides.some(
        (o: MemberWithRelations) => o.overrideType === 'EXEMPT'
      );

      if (isExempt) {
        exemptions++;
        continue;
      }

      // D-17: Members without feeTypeId are excluded from billing with warning
      if (!member.feeTypeId) {
        warnings.push({
          memberId: member.id,
          memberName: `${member.firstName} ${member.lastName}`,
          reason: 'Keine Beitragsart zugewiesen',
        });
        exemptions++;
        continue;
      }

      // Look up base fee from the pre-loaded cross-table map (MembershipType x FeeType)
      const crossTableEntry = crossTableMap.get(`${membershipType.id}:${member.feeTypeId}`) ?? null;

      if (!crossTableEntry) {
        warnings.push({
          memberId: member.id,
          memberName: `${member.firstName} ${member.lastName}`,
          reason: `Kein Betrag in der Beitragstabelle für ${membershipType.name} × ${member.feeType?.name ?? 'Unbekannt'}`,
        });
        continue;
      }

      {
        let baseFee = new Prisma.Decimal(crossTableEntry.amount.toString());
        let discountAmount: Prisma.Decimal | null = null;
        let discountReason: string | null = null;

        // Check for CUSTOM_AMOUNT override
        const customOverride = baseFeeOverrides.find(
          (o: MemberWithRelations) => o.overrideType === 'CUSTOM_AMOUNT'
        );
        if (customOverride?.customAmount) {
          const originalFee = baseFee;
          baseFee = new Prisma.Decimal(customOverride.customAmount.toString());
          const rawDiscount = roundMoney(originalFee.minus(baseFee));
          // Clamp to >= 0: a custom amount above the regular fee is a surcharge, not a
          // discount, so it lands fully in amount with no negative "discount".
          discountAmount = rawDiscount.greaterThan(ZERO) ? rawDiscount : null;
          discountReason = `Individueller Betrag: ${customOverride.reason ?? ''}`.trim();
        }

        // Apply pro-rata if configured
        if (club?.proRataMode === 'MONTHLY_PRO_RATA') {
          baseFee = this.calculateProRata(
            baseFee,
            currentPeriod.joinDate,
            periodStart,
            periodEnd,
            dto.billingInterval
          );
          // Recalculate discount if pro-rata was applied and there was a custom override
          if (customOverride?.customAmount) {
            const originalProRata = this.calculateProRata(
              new Prisma.Decimal(crossTableEntry.amount.toString()),
              currentPeriod.joinDate,
              periodStart,
              periodEnd,
              dto.billingInterval
            );
            const rawProRataDiscount = roundMoney(originalProRata.minus(baseFee));
            discountAmount = rawProRataDiscount.greaterThan(ZERO) ? rawProRataDiscount : null;
          }
        }

        baseFee = roundMoney(baseFee);

        const feeTypeName = member.feeType?.name ?? '';
        const description = this.generateChargeDescription(
          `${membershipType.name} × ${feeTypeName}`,
          periodStart,
          periodEnd,
          dto.billingInterval
        );

        charges.push({
          clubId,
          memberId: member.id,
          feeCategoryId: null,
          membershipTypeId: membershipType.id,
          feeTypeId: member.feeTypeId,
          description,
          periodStart,
          periodEnd,
          amount: baseFee,
          discountAmount,
          discountReason,
        });

        // Track breakdown (keyed by kind+name so a category sharing a name with a
        // membership type does not collide into the same row)
        const typeName = membershipType.name;
        const typeKey = `membershipType:${typeName}`;
        const existing = breakdownMap.get(typeKey);
        if (existing) {
          existing.count++;
          existing.subtotal = existing.subtotal.plus(baseFee);
        } else {
          breakdownMap.set(typeKey, {
            kind: 'membershipType',
            membershipType: typeName,
            count: 1,
            subtotal: baseFee,
          });
        }
      }

      // Calculate additional category fees with scope filtering
      for (const category of feeCategories) {
        // Scope filtering per FeeCategoryScope
        if (category.scope === 'INDIVIDUAL') continue; // Only via MemberFeeOverride
        if (category.scope === 'BY_MEMBERSHIP_TYPE') {
          const matchesMT = category.feeCategoryMembershipTypes.some(
            (mt: { membershipTypeId: string }) => mt.membershipTypeId === membershipType.id
          );
          if (!matchesMT) continue;
        }
        // ALL_MEMBERS: always apply (existing behavior)

        const categoryOverride = member.memberFeeOverrides.find(
          (o: MemberWithRelations) => o.feeCategoryId === category.id
        );
        if (categoryOverride?.overrideType === 'EXEMPT') continue;

        let categoryFee = new Prisma.Decimal(category.amount.toString());
        let catDiscountAmount: Prisma.Decimal | null = null;
        let catDiscountReason: string | null = null;

        if (categoryOverride?.overrideType === 'CUSTOM_AMOUNT' && categoryOverride.customAmount) {
          const originalFee = categoryFee;
          categoryFee = new Prisma.Decimal(categoryOverride.customAmount.toString());
          const rawCatDiscount = roundMoney(originalFee.minus(categoryFee));
          catDiscountAmount = rawCatDiscount.greaterThan(ZERO) ? rawCatDiscount : null;
          catDiscountReason = `Individueller Betrag: ${categoryOverride.reason ?? ''}`.trim();
        }

        // Pro-rate category fees only when the club uses pro-rata AND the category opts in
        // (e.g. recurring section fees). One-time/fixed categories keep the full amount.
        if (club?.proRataMode === 'MONTHLY_PRO_RATA' && category.proRataEligible) {
          categoryFee = this.calculateProRata(
            categoryFee,
            currentPeriod.joinDate,
            periodStart,
            periodEnd,
            dto.billingInterval
          );
          // Recalculate discount against the pro-rated original if there was a custom override
          if (categoryOverride?.overrideType === 'CUSTOM_AMOUNT' && categoryOverride.customAmount) {
            const originalProRata = this.calculateProRata(
              new Prisma.Decimal(category.amount.toString()),
              currentPeriod.joinDate,
              periodStart,
              periodEnd,
              dto.billingInterval
            );
            const rawCatDiscount = roundMoney(originalProRata.minus(categoryFee));
            catDiscountAmount = rawCatDiscount.greaterThan(ZERO) ? rawCatDiscount : null;
          }
        }

        categoryFee = roundMoney(categoryFee);

        const description = this.generateChargeDescription(
          category.name,
          periodStart,
          periodEnd,
          dto.billingInterval
        );

        charges.push({
          clubId,
          memberId: member.id,
          feeCategoryId: category.id,
          membershipTypeId: null,
          feeTypeId: null,
          description,
          periodStart,
          periodEnd,
          amount: categoryFee,
          discountAmount: catDiscountAmount,
          discountReason: catDiscountReason,
        });

        // Track category in breakdown (keyed by kind+name to avoid collisions
        // with same-named membership types)
        const catName = category.name;
        const catKey = `category:${catName}`;
        const existingCat = breakdownMap.get(catKey);
        if (existingCat) {
          existingCat.count++;
          existingCat.subtotal = existingCat.subtotal.plus(categoryFee);
        } else {
          breakdownMap.set(catKey, {
            kind: 'category',
            membershipType: catName,
            count: 1,
            subtotal: categoryFee,
          });
        }
      }
    }

    return {
      charges,
      exemptions,
      warnings,
      breakdown: Array.from(breakdownMap.values()),
    };
  }

  // ─── Private: Pro-Rata Calculation ──────────────────────────────────

  /**
   * Calculate pro-rata fee based on member join date vs billing period.
   * For MONTHLY_PRO_RATA mode with ANNUALLY billing:
   *   amount = feeAmount * (totalMonths - monthsElapsed) / totalMonths
   *
   * PRO-RATA RULE (calendar-month granular, day-of-month intentionally ignored):
   * The calculation works on whole calendar months via `monthDiff`. A member joining
   * on any day of a month is treated as joining that entire month - joining on the
   * 1st and joining on the last day of the same month produce the identical amount.
   * Boundary behavior: join on/before periodStart => full amount, join after periodEnd => zero.
   *
   * Finer day-precision pro-rata is a deferred future enhancement. It is intentionally
   * NOT implemented here because different clubs have different requirements, so it must
   * become a PER-CLUB setting rather than a global change. See the .planning backlog.
   */
  private calculateProRata(
    feeAmount: Prisma.Decimal,
    joinDate: Date,
    periodStart: Date,
    periodEnd: Date,
    _billingInterval: string
  ): Prisma.Decimal {
    const join = new Date(joinDate);

    // If member joined before the period start, they owe the full amount
    if (join <= periodStart) {
      return feeAmount;
    }

    // If member joined after the period end, they owe nothing
    if (join > periodEnd) {
      return ZERO;
    }

    // Calculate total months in the period (inclusive: Jan-Dec = 12 months)
    const totalMonths = this.monthDiff(periodStart, periodEnd) + 1;

    // Calculate months elapsed from period start to join date
    const monthsElapsed = this.monthDiff(periodStart, join);

    // Remaining months
    const remainingMonths = totalMonths - monthsElapsed;

    if (remainingMonths <= 0) return ZERO;

    // Pro-rata: feeAmount * remainingMonths / totalMonths
    return roundMoney(
      feeAmount.mul(new Prisma.Decimal(remainingMonths)).div(new Prisma.Decimal(totalMonths))
    );
  }

  /**
   * Calculate the number of whole calendar months between two dates (year/month only).
   * Day-of-month is intentionally ignored: this is the calendar-month-granular building
   * block for `calculateProRata`. See that method's note for the documented rule and the
   * deferred day-precision (per-club) enhancement.
   */
  private monthDiff(start: Date, end: Date): number {
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  }

  // ─── Private: Description Generator ─────────────────────────────────

  /**
   * Generate a human-readable description for a fee charge.
   */
  private generateChargeDescription(
    name: string,
    periodStart: Date,
    periodEnd: Date,
    billingInterval: string
  ): string {
    const year = periodStart.getFullYear();

    switch (billingInterval) {
      case 'ANNUALLY':
        return `${name} ${year}`;
      case 'QUARTERLY': {
        const quarter = Math.floor(periodStart.getMonth() / 3) + 1;
        return `${name} Q${quarter}/${year}`;
      }
      case 'MONTHLY': {
        const month = periodStart.toLocaleString('de-DE', { month: 'long' });
        return `${name} ${month} ${year}`;
      }
      default:
        return `${name} ${year}`;
    }
  }
}
