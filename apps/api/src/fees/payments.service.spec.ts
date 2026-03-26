import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentsService } from './payments.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/client/index.js';

const { Decimal } = Prisma;

// ─── Mock Data ──────────────────────────────────────────────────────────────

const CLUB_ID = 'club-1';
const USER_ID = 'user-1';
const CHARGE_ID = 'fc-1';

function makeFeeCharge(overrides: Record<string, unknown> = {}) {
  return {
    id: CHARGE_ID,
    clubId: CLUB_ID,
    memberId: 'member-1',
    amount: new Decimal('120.00'),
    dueDate: new Date('2026-02-15'),
    deletedAt: null,
    ...overrides,
  };
}

function makePayment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pay-1',
    feeChargeId: CHARGE_ID,
    amount: new Decimal('50.00'),
    paidAt: new Date('2026-01-20'),
    source: 'MANUAL',
    reference: null,
    notes: null,
    recordedBy: USER_ID,
    deletedAt: null,
    deletedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── Mock Prisma ────────────────────────────────────────────────────────────

const mockPrisma = {
  feeCharge: {
    findFirst: vi.fn(),
  },
  payment: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    aggregate: vi.fn(),
  },
} as unknown as PrismaService;

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PaymentsService(mockPrisma);
  });

  // ─── recordPayment ──────────────────────────────────────────────────

  describe('recordPayment()', () => {
    it('should create Payment record with amount, date, source=MANUAL, recordedBy', async () => {
      const charge = makeFeeCharge();
      const payment = makePayment();

      (mockPrisma.feeCharge.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(charge);
      (mockPrisma.payment.create as ReturnType<typeof vi.fn>).mockResolvedValue(payment);
      (mockPrisma.payment.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({
        _sum: { amount: new Decimal('50.00') },
      });

      const result = await service.recordPayment(CLUB_ID, {
        feeChargeId: CHARGE_ID,
        amount: '50.00',
        paidAt: '2026-01-20',
      }, USER_ID);

      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          feeChargeId: CHARGE_ID,
          amount: expect.any(Decimal),
          source: 'MANUAL',
          recordedBy: USER_ID,
        }),
      });
      expect(result.payment).toBeDefined();
    });

    it('should return PARTIAL status after partial payment (OPEN -> PARTIAL)', async () => {
      const charge = makeFeeCharge();
      const payment = makePayment({ amount: new Decimal('50.00') });

      (mockPrisma.feeCharge.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(charge);
      (mockPrisma.payment.create as ReturnType<typeof vi.fn>).mockResolvedValue(payment);
      (mockPrisma.payment.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({
        _sum: { amount: new Decimal('50.00') },
      });

      const result = await service.recordPayment(CLUB_ID, {
        feeChargeId: CHARGE_ID,
        amount: '50.00',
        paidAt: '2026-01-20',
      }, USER_ID);

      expect(result.chargeStatus.status).toBe('PARTIAL');
      expect(result.chargeStatus.paidAmount).toBe('50.00');
      expect(result.chargeStatus.remainingAmount).toBe('70.00');
    });

    it('should return PAID status after full payment', async () => {
      const charge = makeFeeCharge();
      const payment = makePayment({ amount: new Decimal('120.00') });

      (mockPrisma.feeCharge.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(charge);
      (mockPrisma.payment.create as ReturnType<typeof vi.fn>).mockResolvedValue(payment);
      (mockPrisma.payment.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({
        _sum: { amount: new Decimal('120.00') },
      });

      const result = await service.recordPayment(CLUB_ID, {
        feeChargeId: CHARGE_ID,
        amount: '120.00',
        paidAt: '2026-01-20',
      }, USER_ID);

      expect(result.chargeStatus.status).toBe('PAID');
      expect(result.chargeStatus.paidAmount).toBe('120.00');
      expect(result.chargeStatus.remainingAmount).toBe('0.00');
    });

    it('should return PAID status with overpayment (sum >= amount)', async () => {
      const charge = makeFeeCharge();
      const payment = makePayment({ amount: new Decimal('150.00') });

      (mockPrisma.feeCharge.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(charge);
      (mockPrisma.payment.create as ReturnType<typeof vi.fn>).mockResolvedValue(payment);
      (mockPrisma.payment.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({
        _sum: { amount: new Decimal('150.00') },
      });

      const result = await service.recordPayment(CLUB_ID, {
        feeChargeId: CHARGE_ID,
        amount: '150.00',
        paidAt: '2026-01-20',
      }, USER_ID);

      expect(result.chargeStatus.status).toBe('PAID');
      expect(result.chargeStatus.remainingAmount).toBe('0.00');
    });

    it('should validate feeCharge belongs to the correct club', async () => {
      // Charge not found (wrong club)
      (mockPrisma.feeCharge.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.recordPayment(CLUB_ID, {
          feeChargeId: 'nonexistent',
          amount: '50.00',
          paidAt: '2026-01-20',
        }, USER_ID)
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findPaymentsForCharge ──────────────────────────────────────────

  describe('findPaymentsForCharge()', () => {
    it('should return all non-deleted payments for a fee charge', async () => {
      const payments = [
        makePayment({ id: 'pay-1', amount: new Decimal('50.00') }),
        makePayment({ id: 'pay-2', amount: new Decimal('30.00'), paidAt: new Date('2026-02-10') }),
      ];
      (mockPrisma.payment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(payments);

      const result = await service.findPaymentsForCharge(CHARGE_ID);

      expect(result).toHaveLength(2);
      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith({
        where: { feeChargeId: CHARGE_ID, deletedAt: null },
        orderBy: { paidAt: 'desc' },
      });
    });
  });

  // ─── softDeletePayment ──────────────────────────────────────────────

  describe('softDeletePayment()', () => {
    it('should set deletedAt and recalculate charge status', async () => {
      const payment = makePayment({
        feeCharge: makeFeeCharge(),
      });

      (mockPrisma.payment.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(payment);
      (mockPrisma.payment.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...payment,
        deletedAt: new Date(),
        deletedBy: USER_ID,
      });
      // After soft-delete, no remaining payments -> status OPEN
      (mockPrisma.payment.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await service.softDeletePayment(CLUB_ID, 'pay-1', USER_ID);

      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: {
          deletedAt: expect.any(Date),
          deletedBy: USER_ID,
        },
      });
      expect(result.status).toBe('OPEN');
    });
  });
});
