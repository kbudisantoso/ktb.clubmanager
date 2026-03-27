import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../../../../prisma/generated/client/index.js';
import type { RecordPaymentDto } from './dto/record-payment.dto.js';

const ZERO = new Prisma.Decimal(0);
const DECIMAL_PLACES = 2;

/**
 * Compute charge status from paid vs. charged amounts.
 * Pure function using Prisma.Decimal comparison methods.
 */
export function computeChargeStatus(
  chargeAmount: Prisma.Decimal,
  paidAmount: Prisma.Decimal
): { status: 'OPEN' | 'PARTIAL' | 'PAID'; paidAmount: string; remainingAmount: string } {
  const status = paidAmount.gte(chargeAmount)
    ? ('PAID' as const)
    : paidAmount.gt(ZERO)
      ? ('PARTIAL' as const)
      : ('OPEN' as const);

  const remaining = chargeAmount.minus(paidAmount);
  const remainingAmount = remaining.lt(ZERO) ? ZERO : remaining;

  return {
    status,
    paidAmount: paidAmount.toFixed(DECIMAL_PLACES),
    remainingAmount: remainingAmount.toFixed(DECIMAL_PLACES),
  };
}

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  // ─── Record Payment ─────────────────────────────────────────────────

  /**
   * Record a manual payment against a fee charge.
   * Validates club ownership, creates Payment, and returns updated status.
   */
  async recordPayment(clubId: string, dto: RecordPaymentDto, userId: string) {
    // 1. Validate feeCharge exists and belongs to this club
    const charge = await this.prisma.feeCharge.findFirst({
      where: { id: dto.feeChargeId, clubId, deletedAt: null },
    });

    if (!charge) {
      throw new NotFoundException('Forderung nicht gefunden');
    }

    // 2. Create payment
    const payment = await this.prisma.payment.create({
      data: {
        feeChargeId: dto.feeChargeId,
        amount: new Prisma.Decimal(dto.amount),
        paidAt: new Date(dto.paidAt),
        source: 'MANUAL',
        notes: dto.notes ?? null,
        recordedBy: userId,
      },
    });

    // 3. Recompute charge status using SQL aggregate
    const aggregate = await this.prisma.payment.aggregate({
      where: { feeChargeId: dto.feeChargeId, deletedAt: null },
      _sum: { amount: true },
    });
    const paidAmount = aggregate._sum.amount ?? ZERO;

    const chargeStatus = computeChargeStatus(charge.amount as Prisma.Decimal, paidAmount);

    return {
      payment: this.serializePayment(payment),
      chargeStatus,
    };
  }

  // ─── Find Payments for Charge ───────────────────────────────────────

  /**
   * Return all non-deleted payments for a charge, ordered by paidAt desc.
   */
  async findPaymentsForCharge(clubId: string, feeChargeId: string) {
    // Verify charge belongs to this club before returning payments
    const charge = await this.prisma.feeCharge.findFirst({
      where: { id: feeChargeId, clubId, deletedAt: null },
    });

    if (!charge) {
      throw new NotFoundException('Forderung nicht gefunden');
    }

    const payments = await this.prisma.payment.findMany({
      where: { feeChargeId, deletedAt: null },
      orderBy: { paidAt: 'desc' },
    });

    return payments.map((p) => this.serializePayment(p));
  }

  // ─── Soft Delete Payment ────────────────────────────────────────────

  /**
   * Soft-delete a payment and recalculate charge status.
   * Validates club ownership via the fee charge relation.
   */
  async softDeletePayment(clubId: string, paymentId: string, userId: string) {
    // 1. Find payment with feeCharge for club validation
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, deletedAt: null },
      include: { feeCharge: true },
    });

    if (!payment || payment.feeCharge.clubId !== clubId) {
      throw new NotFoundException('Zahlung nicht gefunden');
    }

    // 2. Soft-delete
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });

    // 3. Recalculate status after deletion
    const aggregate = await this.prisma.payment.aggregate({
      where: { feeChargeId: payment.feeChargeId, deletedAt: null },
      _sum: { amount: true },
    });
    const paidAmount = aggregate._sum.amount ?? ZERO;

    return computeChargeStatus(payment.feeCharge.amount as Prisma.Decimal, paidAmount);
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  /**
   * Serialize payment, converting Decimal fields to strings.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private serializePayment(payment: any) {
    return {
      ...payment,
      amount:
        payment.amount instanceof Prisma.Decimal
          ? payment.amount.toFixed(DECIMAL_PLACES)
          : String(payment.amount),
      paidAt:
        payment.paidAt instanceof Date
          ? payment.paidAt.toISOString().split('T')[0]
          : payment.paidAt,
      createdAt:
        payment.createdAt instanceof Date ? payment.createdAt.toISOString() : payment.createdAt,
      updatedAt:
        payment.updatedAt instanceof Date ? payment.updatedAt.toISOString() : payment.updatedAt,
    };
  }
}
