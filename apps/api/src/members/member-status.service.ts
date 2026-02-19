import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { VALID_TRANSITIONS, type MemberStatus, type LeftCategory } from '@ktb/shared';

/**
 * Helper to format a Date to YYYY-MM-DD string.
 * Avoids timezone shift issues with Prisma @db.Date fields.
 */
function toDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Type alias for the Prisma transaction client used inside $transaction callbacks
type TxClient = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

/**
 * Result of a chain recalculation — returned to callers and used by the preview endpoint.
 */
export interface ChainRecalculationResult {
  removedTransitions: Array<{
    id: string;
    toStatus: string;
    effectiveDate: string;
    reason: string;
  }>;
  restoredTransitions: Array<{ id: string; toStatus: string; effectiveDate: string }>;
  closedPeriods: Array<{ id: string; joinDate: string; closedAt: string }>;
  reopenedPeriods: Array<{ id: string; joinDate: string }>;
  finalMemberStatus: string;
  hasChanges: boolean;
}

@Injectable()
export class MemberStatusService {
  private readonly logger = new Logger(MemberStatusService.name);

  constructor(private prisma: PrismaService) {}

  // ============================================================================
  // Core: Chain Recalculation
  // ============================================================================

  /**
   * Recalculate the transition chain for a member.
   *
   * Algorithm:
   * 0. Restore cascade-deleted entries whose causing transition was removed
   * 1. Fetch all non-deleted transitions (effectiveDate ASC, createdAt ASC)
   * 2. Walk the chain from PENDING, validating each transition
   * 3. Soft-delete invalid entries with deletedByTransitionId tracking
   * 4. Close/reopen periods based on terminal state
   * 5. Update member.status to the chain's final state
   */
  private async recalculateChain(
    tx: TxClient,
    clubId: string,
    memberId: string,
    actorId: string,
    triggerTransitionId: string | null,
    dryRun: boolean = false
  ): Promise<ChainRecalculationResult> {
    const result: ChainRecalculationResult = {
      removedTransitions: [],
      restoredTransitions: [],
      closedPeriods: [],
      reopenedPeriods: [],
      finalMemberStatus: 'PENDING',
      hasChanges: false,
    };

    // Step 0: Restore cascade-deleted entries whose causing transition is now deleted
    const cascadeDeleted = await tx.memberStatusTransition.findMany({
      where: { memberId, clubId, deletedByTransitionId: { not: null } },
    });

    for (const entry of cascadeDeleted) {
      // Check if the causing transition is now soft-deleted itself
      const causingTransition = await tx.memberStatusTransition.findFirst({
        where: { id: entry.deletedByTransitionId!, deletedAt: { not: null } },
      });

      if (causingTransition) {
        if (!dryRun) {
          await tx.memberStatusTransition.update({
            where: { id: entry.id },
            data: { deletedAt: null, deletedBy: null, deletedByTransitionId: null },
          });
        }
        result.restoredTransitions.push({
          id: entry.id,
          toStatus: entry.toStatus,
          effectiveDate: toDateString(entry.effectiveDate),
        });
        result.hasChanges = true;
      }
    }

    // Step 1: Fetch all non-deleted transitions in chain order
    const transitions = await tx.memberStatusTransition.findMany({
      where: { memberId, clubId, deletedAt: null },
      orderBy: [{ effectiveDate: 'asc' }, { createdAt: 'asc' }],
    });

    if (transitions.length === 0) {
      result.finalMemberStatus = 'PENDING';

      // Still handle period auto-maintenance even with empty chain
      await this.autoMaintainPeriodLeaveDates(tx, memberId, false, null, result, dryRun);

      if (!dryRun && result.hasChanges) {
        await this.syncMemberStatus(tx, memberId, 'PENDING', actorId);
      }

      return result;
    }

    // Step 3: Walk the chain
    let currentStatus: MemberStatus = 'PENDING';
    let terminalReached = false;
    let terminalTransitionId: string | null = null;
    let terminalDate: Date | null = null;

    for (const transition of transitions) {
      const toStatus = transition.toStatus as MemberStatus;

      if (terminalReached) {
        // Everything after terminal (LEFT) gets cascade-deleted
        if (!dryRun) {
          await tx.memberStatusTransition.update({
            where: { id: transition.id },
            data: {
              deletedAt: new Date(),
              deletedBy: actorId,
              deletedByTransitionId: terminalTransitionId,
            },
          });
        }
        result.removedTransitions.push({
          id: transition.id,
          toStatus: transition.toStatus,
          effectiveDate: toDateString(transition.effectiveDate),
          reason: transition.reason,
        });
        result.hasChanges = true;
        continue;
      }

      // Validate: currentStatus → toStatus is a valid transition?
      const allowed: readonly MemberStatus[] = VALID_TRANSITIONS[currentStatus];
      if (allowed.includes(toStatus)) {
        currentStatus = toStatus;
      } else {
        // Invalid transition given current chain state — cascade-delete
        if (!dryRun) {
          await tx.memberStatusTransition.update({
            where: { id: transition.id },
            data: {
              deletedAt: new Date(),
              deletedBy: actorId,
              deletedByTransitionId: triggerTransitionId,
            },
          });
        }
        result.removedTransitions.push({
          id: transition.id,
          toStatus: transition.toStatus,
          effectiveDate: toDateString(transition.effectiveDate),
          reason: transition.reason,
        });
        result.hasChanges = true;
        continue;
      }

      if (currentStatus === 'LEFT') {
        terminalReached = true;
        terminalTransitionId = transition.id;
        terminalDate = transition.effectiveDate;
      }
    }

    result.finalMemberStatus = currentStatus;

    // Step 4: Auto-maintain period leaveDates
    // Rule: leaveDate = next period's joinDate, or terminalDate, or null
    await this.autoMaintainPeriodLeaveDates(
      tx,
      memberId,
      terminalReached,
      terminalDate,
      result,
      dryRun
    );

    // Step 6: Sync member status + cancellation
    if (!dryRun) {
      await this.syncMemberStatus(
        tx,
        memberId,
        currentStatus,
        actorId,
        terminalReached ? (terminalDate ?? undefined) : undefined
      );
    }

    return result;
  }

  /**
   * Auto-maintain period leaveDates based on the chain of periods.
   *
   * Rules:
   * - Period[i].leaveDate = Period[i+1].joinDate (derived from successor)
   * - Last period + terminal (LEFT): leaveDate = terminalDate
   * - Last period + NOT terminal: leaveDate = null
   * - Period with joinDate >= terminalDate: leaveDate = joinDate (zero-length)
   */
  private async autoMaintainPeriodLeaveDates(
    tx: TxClient,
    memberId: string,
    terminalReached: boolean,
    terminalDate: Date | null,
    result: ChainRecalculationResult,
    dryRun: boolean
  ) {
    const allPeriods = await tx.membershipPeriod.findMany({
      where: { memberId },
      orderBy: { joinDate: 'asc' },
    });

    for (let i = 0; i < allPeriods.length; i++) {
      const period = allPeriods[i]!;
      const nextPeriod = allPeriods[i + 1] ?? null;

      let expectedLeaveDate: Date | null = null;

      if (
        terminalReached &&
        terminalDate &&
        toDateString(period.joinDate) >= toDateString(terminalDate)
      ) {
        // Period starts at or after terminal → close at joinDate (zero-length)
        expectedLeaveDate = period.joinDate;
      } else if (nextPeriod) {
        // Has successor → leaveDate = next period's joinDate
        expectedLeaveDate = nextPeriod.joinDate;
      } else if (terminalReached && terminalDate) {
        // Last period and terminal reached → close at terminal date
        expectedLeaveDate = terminalDate;
      } else {
        // Last period and NOT terminal → open
        expectedLeaveDate = null;
      }

      // Check if update is needed
      const currentLeave = period.leaveDate ? toDateString(period.leaveDate) : null;
      const expectedLeave = expectedLeaveDate ? toDateString(expectedLeaveDate) : null;

      if (currentLeave !== expectedLeave) {
        if (!dryRun) {
          await tx.membershipPeriod.update({
            where: { id: period.id },
            data: { leaveDate: expectedLeaveDate },
          });
        }

        // Track in result
        if (expectedLeaveDate && !period.leaveDate) {
          result.closedPeriods.push({
            id: period.id,
            joinDate: toDateString(period.joinDate),
            closedAt: toDateString(expectedLeaveDate),
          });
        } else if (!expectedLeaveDate && period.leaveDate) {
          result.reopenedPeriods.push({
            id: period.id,
            joinDate: toDateString(period.joinDate),
          });
        } else if (expectedLeaveDate && period.leaveDate) {
          result.closedPeriods.push({
            id: period.id,
            joinDate: toDateString(period.joinDate),
            closedAt: toDateString(expectedLeaveDate),
          });
        }

        result.hasChanges = true;
      }
    }
  }

  /**
   * Update member.status and cancellation-related fields after chain recalculation.
   */
  private async syncMemberStatus(
    tx: TxClient,
    memberId: string,
    finalStatus: MemberStatus,
    actorId: string,
    terminalDate?: Date
  ) {
    const member = await tx.member.findFirst({ where: { id: memberId } });
    if (!member) return;

    const data: Record<string, unknown> = {
      status: finalStatus,
      statusChangedAt: new Date(),
      statusChangedBy: actorId,
      version: { increment: 1 },
    };

    // If LEFT and no cancellation date, set it
    if (finalStatus === 'LEFT' && !member.cancellationDate && terminalDate) {
      data.cancellationDate = terminalDate;
    }

    // If no longer LEFT: clear auto-set cancellationDate (no cancellationReceivedAt = auto-set)
    // Keep formal cancellations (cancellationReceivedAt is set) — they're still valid
    if (finalStatus !== 'LEFT' && member.cancellationDate && !member.cancellationReceivedAt) {
      data.cancellationDate = null;
    }

    await tx.member.update({ where: { id: memberId }, data });
  }

  /**
   * Compute the status at a specific date by walking the chain.
   */
  private getStatusAtDate(
    transitions: Array<{ effectiveDate: Date; toStatus: string }>,
    targetDate: string
  ): MemberStatus {
    let status: MemberStatus = 'PENDING';
    for (const t of transitions) {
      if (toDateString(t.effectiveDate) > targetDate) break;
      status = t.toStatus as MemberStatus;
    }
    return status;
  }

  // ============================================================================
  // Mutations
  // ============================================================================

  /**
   * Change a member's status with validation against the VALID_TRANSITIONS state machine.
   * Wrapped in $transaction for atomicity. Creates a MemberStatusTransition audit record.
   * After creating the transition, runs chain recalculation to ensure consistency.
   */
  async changeStatus(
    clubId: string,
    memberId: string,
    newStatus: MemberStatus,
    reason: string,
    userId: string,
    effectiveDate?: string,
    leftCategory?: LeftCategory,
    membershipTypeId?: string
  ) {
    const effectiveDateValue = effectiveDate || toDateString(new Date());

    return this.prisma.$transaction(async (tx) => {
      const member = await tx.member.findFirst({
        where: { id: memberId, clubId, deletedAt: null },
      });

      if (!member) {
        throw new NotFoundException('Mitglied nicht gefunden');
      }

      // Chain-aware validation: use chain status at the effective date for backdated entries
      const chain = await tx.memberStatusTransition.findMany({
        where: { memberId, clubId, deletedAt: null },
        orderBy: [{ effectiveDate: 'asc' }, { createdAt: 'asc' }],
      });

      // One-entry-per-day validation (uses chain for self-transition detection)
      const existingOnDate = chain.find(
        (t) => toDateString(t.effectiveDate) === effectiveDateValue
      );
      if (existingOnDate) {
        // Determine if the existing entry is a self-transition (no actual status change).
        // Self-transitions are setCancellation audit markers that can be replaced.
        const chainBeforeEntry = chain.filter((t) => t.id !== existingOnDate.id);
        const statusBeforeEntry = this.getStatusAtDate(chainBeforeEntry, effectiveDateValue);
        const isSelfTransitionAudit = existingOnDate.toStatus === statusBeforeEntry;
        if (isSelfTransitionAudit) {
          await tx.memberStatusTransition.update({
            where: { id: existingOnDate.id },
            data: { deletedAt: new Date(), deletedBy: userId },
          });
          // Remove from chain so subsequent logic uses the cleaned chain
          chain.splice(chain.indexOf(existingOnDate), 1);
        } else {
          throw new BadRequestException('An diesem Datum existiert bereits ein Statuseintrag');
        }
      }

      const statusAtDate = this.getStatusAtDate(chain, effectiveDateValue);
      const isSelfTransition = statusAtDate === newStatus;
      const allowedTransitions: readonly MemberStatus[] = VALID_TRANSITIONS[statusAtDate];

      if (!allowedTransitions.includes(newStatus)) {
        throw new BadRequestException(
          `Ungültige Statusänderung: ${statusAtDate} -> ${newStatus} ist nicht erlaubt. ` +
            `Erlaubte Übergänge: ${allowedTransitions.length > 0 ? allowedTransitions.join(', ') : 'keine (Endstatus)'}`
        );
      }

      // Validate leftCategory is provided when transitioning to LEFT
      if (newStatus === 'LEFT' && !leftCategory) {
        throw new BadRequestException(
          'Austrittsgrund (leftCategory) ist erforderlich bei Statuswechsel zu LEFT'
        );
      }

      // Self-transitions require membershipTypeId (that's the whole point)
      if (isSelfTransition && !membershipTypeId) {
        throw new BadRequestException(
          'Mitgliedsart ist erforderlich bei Änderung der Mitgliedsart'
        );
      }

      // Create audit trail record (no fromStatus — computed on read)
      const newTransition = await tx.memberStatusTransition.create({
        data: {
          memberId,
          clubId,
          toStatus: newStatus,
          reason,
          leftCategory: newStatus === 'LEFT' ? leftCategory : null,
          effectiveDate: new Date(effectiveDateValue),
          actorId: userId,
        },
      });

      // Handle period management for non-LEFT transitions
      if (newStatus !== 'LEFT') {
        // Find the period containing the effective date (date-range, not just open)
        const allPeriods = await tx.membershipPeriod.findMany({
          where: { memberId },
          orderBy: { joinDate: 'asc' },
        });
        const currentPeriod =
          allPeriods.find(
            (p) =>
              toDateString(p.joinDate) <= effectiveDateValue &&
              (!p.leaveDate || toDateString(p.leaveDate) > effectiveDateValue)
          ) ?? null;

        if (
          currentPeriod &&
          membershipTypeId &&
          currentPeriod.membershipTypeId !== membershipTypeId
        ) {
          // Type change: create new period (leaveDate auto-derived by recalculateChain)
          await tx.membershipPeriod.create({
            data: {
              memberId,
              joinDate: new Date(effectiveDateValue),
              membershipTypeId,
            },
          });
        } else if (!currentPeriod) {
          // No active period — create one (membershipTypeId may be null)
          await tx.membershipPeriod.create({
            data: {
              memberId,
              joinDate: new Date(effectiveDateValue),
              ...(membershipTypeId ? { membershipTypeId } : {}),
            },
          });
        }
      }

      // Run chain recalculation
      const chainResult = await this.recalculateChain(
        tx,
        clubId,
        memberId,
        userId,
        newTransition.id
      );

      this.logger.log(
        `Status change: Member ${memberId} → ${newStatus} by ${userId} (chain: ${chainResult.removedTransitions.length} removed, ${chainResult.closedPeriods.length} periods closed)`
      );

      // Return the updated member (recalculateChain already synced the status)
      return tx.member.findFirstOrThrow({ where: { id: memberId } });
    });
  }

  /**
   * Set a cancellation date for a member.
   *
   * When the cancellation date is today or in the past, the member is
   * immediately transitioned to LEFT via changeStatus() (which runs
   * recalculateChain for full chain integrity).
   *
   * When the cancellation date is in the future, a self-transition audit
   * entry is created and the scheduler handles the actual LEFT transition
   * at midnight on the cancellation date.
   */
  async setCancellation(
    clubId: string,
    memberId: string,
    cancellationDate: string,
    cancellationReceivedAt: string,
    userId: string,
    reason: string
  ) {
    const today = toDateString(new Date());
    const isImmediate = cancellationDate <= today;

    // Phase 1: Record the cancellation intent on the member record
    await this.prisma.$transaction(async (tx) => {
      const member = await tx.member.findFirst({
        where: { id: memberId, clubId, deletedAt: null },
      });

      if (!member) {
        throw new NotFoundException('Mitglied nicht gefunden');
      }

      const currentStatus = member.status as MemberStatus;
      const cancellableStatuses: MemberStatus[] = ['ACTIVE', 'PROBATION', 'DORMANT', 'SUSPENDED'];

      if (!cancellableStatuses.includes(currentStatus)) {
        throw new BadRequestException(
          `Kündigung kann nur für aktive, auf Probe, ruhende oder gesperrte Mitglieder erfasst werden. Aktueller Status: ${currentStatus}`
        );
      }

      if (member.cancellationDate) {
        throw new BadRequestException(
          `Für dieses Mitglied ist bereits eine Kündigung zum ${toDateString(member.cancellationDate)} erfasst`
        );
      }

      // Only create self-transition audit entry for future cancellations.
      // Immediate cancellations get a proper LEFT transition via changeStatus below.
      if (!isImmediate) {
        await tx.memberStatusTransition.create({
          data: {
            memberId,
            clubId,
            toStatus: currentStatus,
            reason: reason || `Kündigung zum ${cancellationDate} erfasst`,
            effectiveDate: new Date(cancellationDate),
            actorId: userId,
          },
        });
      }

      await tx.member.update({
        where: { id: memberId },
        data: {
          cancellationDate: new Date(cancellationDate),
          cancellationReceivedAt: new Date(cancellationReceivedAt),
          statusChangeReason: reason || `Kündigung zum ${cancellationDate} erfasst`,
          statusChangedAt: new Date(),
          statusChangedBy: userId,
          version: { increment: 1 },
        },
      });

      this.logger.log(
        `Cancellation set: Member ${memberId} cancellation date ${cancellationDate} by ${userId}`
      );
    });

    // Phase 2: Immediate cancellation → transition to LEFT now
    if (isImmediate) {
      this.logger.log(
        `Cancellation date ${cancellationDate} is today or past — immediately transitioning member ${memberId} to LEFT`
      );
      return this.changeStatus(
        clubId,
        memberId,
        'LEFT' as MemberStatus,
        reason || `Austritt zum ${cancellationDate} (Kündigung)`,
        userId,
        cancellationDate,
        'VOLUNTARY' as LeftCategory
      );
    }

    return this.prisma.member.findFirstOrThrow({
      where: { id: memberId, clubId },
    });
  }

  /**
   * Revoke an existing cancellation.
   *
   * Handles two scenarios:
   * - Member is NOT yet LEFT (future cancellation): soft-deletes the self-transition
   *   audit entry at the cancellation date and clears the cancellation fields.
   * - Member IS already LEFT (immediate/scheduled cancellation): soft-deletes the
   *   LEFT transition at the cancellation date, clears the cancellation fields,
   *   and runs recalculateChain to restore the prior status.
   */
  async revokeCancellation(clubId: string, memberId: string, userId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.member.findFirst({
        where: { id: memberId, clubId, deletedAt: null },
      });

      if (!member) {
        throw new NotFoundException('Mitglied nicht gefunden');
      }

      if (!member.cancellationDate) {
        throw new BadRequestException('Keine Kündigung vorhanden');
      }

      const wasLeft = member.status === 'LEFT';

      // Soft-delete transitions at the cancellation date that were created
      // by setCancellation (self-transition) or the LEFT auto-transition.
      const relatedTransitions = await tx.memberStatusTransition.findMany({
        where: {
          memberId,
          clubId,
          effectiveDate: member.cancellationDate,
          deletedAt: null,
        },
      });

      for (const t of relatedTransitions) {
        await tx.memberStatusTransition.update({
          where: { id: t.id },
          data: { deletedAt: new Date(), deletedBy: userId },
        });
      }

      // Clear cancellation fields
      await tx.member.update({
        where: { id: memberId },
        data: {
          cancellationDate: null,
          cancellationReceivedAt: null,
          statusChangeReason: reason || 'Kündigung widerrufen',
          statusChangedAt: new Date(),
          statusChangedBy: userId,
          version: { increment: 1 },
        },
      });

      // Recalculate chain to restore correct status (especially if member was LEFT)
      if (wasLeft || relatedTransitions.length > 0) {
        await this.recalculateChain(tx, clubId, memberId, userId, null);
      }

      this.logger.log(
        `Cancellation revoked: Member ${memberId} by ${userId}` +
          (wasLeft ? ' (reverted from LEFT)' : '')
      );

      return tx.member.findFirstOrThrow({ where: { id: memberId } });
    });
  }

  /**
   * Bulk status change for multiple members.
   */
  async bulkChangeStatus(
    clubId: string,
    memberIds: string[],
    newStatus: MemberStatus,
    reason: string,
    userId: string,
    leftCategory?: LeftCategory
  ) {
    const updated: string[] = [];
    const skipped: { id: string; reason: string }[] = [];

    for (const memberId of memberIds) {
      try {
        await this.changeStatus(
          clubId,
          memberId,
          newStatus,
          reason,
          userId,
          undefined,
          leftCategory
        );
        updated.push(memberId);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
        skipped.push({ id: memberId, reason: message });
      }
    }

    this.logger.log(
      `Bulk status change: ${updated.length} updated, ${skipped.length} skipped (target: ${newStatus})`
    );

    return { updated, skipped };
  }

  // ============================================================================
  // Queries
  // ============================================================================

  /**
   * Get status transition history for a member.
   * Computes fromStatus on read by walking the chain from PENDING.
   */
  async getStatusHistory(clubId: string, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, clubId, deletedAt: null },
    });

    if (!member) {
      throw new NotFoundException('Mitglied nicht gefunden');
    }

    const transitions = await this.prisma.memberStatusTransition.findMany({
      where: { memberId, clubId, deletedAt: null },
      orderBy: [{ effectiveDate: 'asc' }, { createdAt: 'asc' }],
    });

    // Compute fromStatus by walking the chain
    let currentStatus: string = 'PENDING';
    const enriched = transitions.map((t) => {
      const fromStatus = currentStatus;
      currentStatus = t.toStatus;
      return { ...t, fromStatus };
    });

    // Return in DESC order for the frontend
    return enriched.reverse().map((t) => ({
      id: t.id,
      memberId: t.memberId,
      clubId: t.clubId,
      fromStatus: t.fromStatus,
      toStatus: t.toStatus,
      reason: t.reason,
      leftCategory: t.leftCategory,
      effectiveDate: toDateString(t.effectiveDate),
      actorId: t.actorId,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  // ============================================================================
  // History Entry Mutations
  // ============================================================================

  /**
   * Update a status history entry (reason, effectiveDate, leftCategory).
   * Wrapped in transaction. Triggers chain recalculation after update.
   */
  async updateStatusHistoryEntry(
    clubId: string,
    memberId: string,
    transitionId: string,
    updates: { reason?: string; effectiveDate?: string; leftCategory?: LeftCategory },
    userId: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      const transition = await tx.memberStatusTransition.findFirst({
        where: { id: transitionId, memberId, clubId, deletedAt: null },
      });

      if (!transition) {
        throw new NotFoundException('Statusuebergang nicht gefunden');
      }

      // One-entry-per-day validation when effectiveDate changes
      if (updates.effectiveDate !== undefined) {
        const existingOnDate = await tx.memberStatusTransition.findFirst({
          where: {
            memberId,
            clubId,
            effectiveDate: new Date(updates.effectiveDate),
            deletedAt: null,
            id: { not: transitionId },
          },
        });
        if (existingOnDate) {
          throw new BadRequestException('An diesem Datum existiert bereits ein Statuseintrag');
        }
      }

      const data: Record<string, unknown> = {};
      if (updates.reason !== undefined) {
        data.reason = updates.reason;
      }
      if (updates.effectiveDate !== undefined) {
        data.effectiveDate = new Date(updates.effectiveDate);
      }
      if (updates.leftCategory !== undefined) {
        data.leftCategory = updates.leftCategory;
      }

      const updated = await tx.memberStatusTransition.update({
        where: { id: transitionId },
        data,
      });

      // Recalculate chain after edit
      await this.recalculateChain(tx, clubId, memberId, userId, transitionId);

      this.logger.log(
        `Status history entry ${transitionId} updated by ${userId} for member ${memberId}`
      );

      // Compute fromStatus for the response
      const allTransitions = await tx.memberStatusTransition.findMany({
        where: { memberId, clubId, deletedAt: null },
        orderBy: [{ effectiveDate: 'asc' }, { createdAt: 'asc' }],
      });
      let computedFromStatus: string = 'PENDING';
      for (const t of allTransitions) {
        if (t.id === updated.id) break;
        computedFromStatus = t.toStatus;
      }

      return {
        id: updated.id,
        memberId: updated.memberId,
        clubId: updated.clubId,
        fromStatus: computedFromStatus,
        toStatus: updated.toStatus,
        reason: updated.reason,
        leftCategory: updated.leftCategory,
        effectiveDate: toDateString(updated.effectiveDate),
        actorId: updated.actorId,
        createdAt: updated.createdAt.toISOString(),
      };
    });
  }

  /**
   * Soft-delete a status history entry.
   * Chain recalculation handles cascade restoration and status correction.
   * No longer restricted to non-latest entries — chain recalculation maintains consistency.
   */
  async deleteStatusHistoryEntry(
    clubId: string,
    memberId: string,
    transitionId: string,
    userId: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      const transition = await tx.memberStatusTransition.findFirst({
        where: { id: transitionId, memberId, clubId, deletedAt: null },
      });

      if (!transition) {
        throw new NotFoundException('Statusuebergang nicht gefunden');
      }

      // Guard: block deletion of LEFT transitions when a formal cancellation exists.
      // The correct workflow is "Kündigung widerrufen" which handles both consistently.
      if (transition.toStatus === 'LEFT') {
        const member = await tx.member.findFirst({
          where: { id: memberId, clubId, deletedAt: null },
        });
        if (member?.cancellationDate && member.cancellationReceivedAt) {
          throw new BadRequestException(
            'Dieser Austritt basiert auf einer erfassten Kündigung. ' +
              'Bitte nutze "Kündigung widerrufen" um den Austritt rückgängig zu machen.'
          );
        }
      }

      await tx.memberStatusTransition.update({
        where: { id: transitionId },
        data: {
          deletedAt: new Date(),
          deletedBy: userId,
        },
      });

      // Recalculate chain — Step 0 will restore cascade-deleted entries if needed
      await this.recalculateChain(tx, clubId, memberId, userId, null);

      this.logger.log(
        `Status history entry ${transitionId} soft-deleted by ${userId} for member ${memberId}`
      );

      return { success: true };
    });
  }

  // ============================================================================
  // Preview
  // ============================================================================

  /**
   * Preview the impact of a status change without writing to the database.
   * Used by the frontend to show warnings for backdated entries.
   */
  async previewChangeStatus(
    clubId: string,
    memberId: string,
    newStatus: MemberStatus,
    reason: string,
    userId: string,
    effectiveDate?: string,
    leftCategory?: LeftCategory
  ): Promise<ChainRecalculationResult> {
    const effectiveDateValue = effectiveDate || toDateString(new Date());

    return this.prisma
      .$transaction(async (tx) => {
        const member = await tx.member.findFirst({
          where: { id: memberId, clubId, deletedAt: null },
        });

        if (!member) {
          throw new NotFoundException('Mitglied nicht gefunden');
        }

        // Create a temporary transition (will be rolled back)
        const tempTransition = await tx.memberStatusTransition.create({
          data: {
            memberId,
            clubId,
            toStatus: newStatus,
            reason,
            leftCategory: newStatus === 'LEFT' ? leftCategory : null,
            effectiveDate: new Date(effectiveDateValue),
            actorId: userId,
          },
        });

        // Run chain recalculation in dry-run mode
        const result = await this.recalculateChain(
          tx,
          clubId,
          memberId,
          userId,
          tempTransition.id,
          true // dryRun
        );

        // Transaction will be rolled back since we throw after getting the result
        // Actually, we need a different approach — use a nested savepoint or just compute
        // Instead, let's abort the transaction to roll back the temp transition
        throw new PreviewResultError(result);
      })
      .catch((error) => {
        if (error instanceof PreviewResultError) {
          return error.result;
        }
        throw error;
      });
  }
}

/**
 * Internal error used to abort the preview transaction and return the dry-run result.
 */
class PreviewResultError extends Error {
  constructor(public readonly result: ChainRecalculationResult) {
    super('Preview result');
  }
}
