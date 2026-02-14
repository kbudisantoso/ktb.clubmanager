import { describe, expect, it } from 'vitest';
import { computeSettingsCompleteness } from './settings-completeness';
import type { SettingsFormValues } from '@/components/settings/club-settings-form';

/** Minimal empty form values */
function emptyValues(): SettingsFormValues {
  return {
    name: 'Test Club',
    legalName: '',
    shortCode: '',
    foundedAt: '',
    description: '',
    street: '',
    houseNumber: '',
    postalCode: '',
    city: '',
    phone: '',
    email: '',
    website: '',
    isRegistered: false,
    registryCourt: '',
    registryNumber: '',
    clubPurpose: undefined,
    clubSpecialForm: undefined,
    taxNumber: '',
    vatId: '',
    taxOffice: '',
    isNonProfit: false,
    iban: '',
    bic: '',
    bankName: '',
    accountHolder: '',
    fiscalYearStartMonth: undefined,
    defaultMembershipType: undefined,
    probationPeriodDays: undefined,
    visibility: 'PRIVATE',
    logoFileId: undefined,
  };
}

/** Fully complete form values */
function completeValues(): SettingsFormValues {
  return {
    ...emptyValues(),
    shortCode: 'TSV',
    foundedAt: '1920-01-01',
    street: 'Hauptstraße',
    houseNumber: '1',
    postalCode: '76131',
    city: 'Karlsruhe',
    email: 'info@verein.de',
    clubPurpose: 'IDEALVEREIN',
    clubSpecialForm: 'KEINE',
    taxNumber: '12345/67890',
    taxOffice: 'Finanzamt Karlsruhe',
    iban: 'DE89370400440532013000',
    accountHolder: 'Sportverein e.V.',
    fiscalYearStartMonth: 1,
    defaultMembershipType: 'ORDENTLICH',
  };
}

describe('computeSettingsCompleteness', () => {
  it('returns low percentage for empty values (only name filled)', () => {
    const result = computeSettingsCompleteness(emptyValues());
    // name is filled → 1/16 = 6%
    expect(result.totalFilled).toBe(1);
    expect(result.totalFields).toBe(16);
    expect(result.percentage).toBe(6);
  });

  it('returns 100% for fully complete values', () => {
    const result = computeSettingsCompleteness(completeValues());
    expect(result.percentage).toBe(100);
    expect(result.sections.every((s) => s.complete)).toBe(true);
    expect(result.sections.every((s) => s.hint === '')).toBe(true);
  });

  it('percentage increases with each filled field', () => {
    const base = emptyValues();
    const p0 = computeSettingsCompleteness(base).percentage;

    const withShortCode = { ...base, shortCode: 'TSV' };
    const p1 = computeSettingsCompleteness(withShortCode).percentage;
    expect(p1).toBeGreaterThan(p0);

    const withMore = { ...withShortCode, street: 'Hauptstraße', email: 'test@test.de' };
    const p2 = computeSettingsCompleteness(withMore).percentage;
    expect(p2).toBeGreaterThan(p1);
  });

  describe('Stammdaten', () => {
    it('counts name as filled by default', () => {
      const section = computeSettingsCompleteness(emptyValues()).sections[0];
      expect(section.label).toBe('Stammdaten');
      expect(section.filled).toBe(1);
      expect(section.total).toBe(3);
      expect(section.complete).toBe(false);
      expect(section.hint).toBe('Vereinskürzel angeben');
    });

    it('complete with name + shortCode + foundedAt', () => {
      const values = { ...emptyValues(), shortCode: 'TSV', foundedAt: '1920-01-01' };
      const section = computeSettingsCompleteness(values).sections[0];
      expect(section.complete).toBe(true);
      expect(section.filled).toBe(3);
    });
  });

  describe('Adresse & Kontakt', () => {
    it('counts individual address fields', () => {
      const values = { ...emptyValues(), street: 'Hauptstraße', city: 'Karlsruhe' };
      const section = computeSettingsCompleteness(values).sections[1];
      expect(section.filled).toBe(2);
      expect(section.total).toBe(5);
      expect(section.complete).toBe(false);
      expect(section.hint).toBe('Adresse vervollständigen');
    });

    it('incomplete with address but no contact', () => {
      const values = {
        ...emptyValues(),
        street: 'Hauptstraße',
        houseNumber: '1',
        postalCode: '76131',
        city: 'Karlsruhe',
      };
      const section = computeSettingsCompleteness(values).sections[1];
      expect(section.filled).toBe(4);
      expect(section.complete).toBe(false);
      expect(section.hint).toBe('E-Mail oder Telefon angeben');
    });

    it('complete with address and phone only', () => {
      const values = {
        ...emptyValues(),
        street: 'Hauptstraße',
        houseNumber: '1',
        postalCode: '76131',
        city: 'Karlsruhe',
        phone: '0721 12345',
      };
      const section = computeSettingsCompleteness(values).sections[1];
      expect(section.complete).toBe(true);
      expect(section.filled).toBe(5);
    });
  });

  describe('Vereinsregister', () => {
    it('tracks purpose and form as individual fields', () => {
      const values = { ...emptyValues(), clubPurpose: 'IDEALVEREIN' as const };
      const section = computeSettingsCompleteness(values).sections[2];
      expect(section.filled).toBe(1);
      expect(section.total).toBe(2);
      expect(section.complete).toBe(false);
    });

    it('complete without registration when purpose and form set', () => {
      const values = {
        ...emptyValues(),
        clubPurpose: 'IDEALVEREIN' as const,
        clubSpecialForm: 'KEINE' as const,
        isRegistered: false,
      };
      const section = computeSettingsCompleteness(values).sections[2];
      expect(section.complete).toBe(true);
      expect(section.filled).toBe(2);
      expect(section.total).toBe(2);
    });

    it('expands to 4 fields when registered', () => {
      const values = {
        ...emptyValues(),
        clubPurpose: 'IDEALVEREIN' as const,
        clubSpecialForm: 'KEINE' as const,
        isRegistered: true,
      };
      const section = computeSettingsCompleteness(values).sections[2];
      expect(section.total).toBe(4);
      expect(section.filled).toBe(2);
      expect(section.complete).toBe(false);
      expect(section.hint).toBe('Registergericht angeben');
    });

    it('complete when registered with registry details', () => {
      const values = {
        ...emptyValues(),
        clubPurpose: 'IDEALVEREIN' as const,
        clubSpecialForm: 'KEINE' as const,
        isRegistered: true,
        registryCourt: 'AG Karlsruhe',
        registryNumber: 'VR 12345',
      };
      const section = computeSettingsCompleteness(values).sections[2];
      expect(section.complete).toBe(true);
      expect(section.filled).toBe(4);
    });
  });

  describe('Steuerdaten', () => {
    it('shows partial progress with taxNumber only', () => {
      const values = { ...emptyValues(), taxNumber: '12345/67890' };
      const section = computeSettingsCompleteness(values).sections[3];
      expect(section.filled).toBe(1);
      expect(section.total).toBe(2);
      expect(section.complete).toBe(false);
      expect(section.hint).toBe('Finanzamt angeben');
    });

    it('complete with taxNumber + taxOffice', () => {
      const values = {
        ...emptyValues(),
        taxNumber: '12345/67890',
        taxOffice: 'Finanzamt Karlsruhe',
      };
      const section = computeSettingsCompleteness(values).sections[3];
      expect(section.complete).toBe(true);
    });

    it('complete with vatId only (counts as 2/2)', () => {
      const values = { ...emptyValues(), vatId: 'DE123456789' };
      const section = computeSettingsCompleteness(values).sections[3];
      expect(section.complete).toBe(true);
      expect(section.filled).toBe(2);
    });
  });

  describe('Bankverbindung', () => {
    it('shows partial progress with iban only', () => {
      const values = { ...emptyValues(), iban: 'DE89370400440532013000' };
      const section = computeSettingsCompleteness(values).sections[4];
      expect(section.filled).toBe(1);
      expect(section.complete).toBe(false);
      expect(section.hint).toBe('Kontoinhaber angeben');
    });

    it('complete with iban + accountHolder', () => {
      const values = {
        ...emptyValues(),
        iban: 'DE89370400440532013000',
        accountHolder: 'Verein e.V.',
      };
      const section = computeSettingsCompleteness(values).sections[4];
      expect(section.complete).toBe(true);
    });
  });

  describe('Vereinsvorgaben', () => {
    it('shows partial progress with fiscalYearStartMonth only', () => {
      const values = { ...emptyValues(), fiscalYearStartMonth: 1 };
      const section = computeSettingsCompleteness(values).sections[5];
      expect(section.filled).toBe(1);
      expect(section.complete).toBe(false);
      expect(section.hint).toBe('Standard-Mitgliedsart auswählen');
    });

    it('complete with both fields', () => {
      const values = {
        ...emptyValues(),
        fiscalYearStartMonth: 1,
        defaultMembershipType: 'ORDENTLICH' as const,
      };
      const section = computeSettingsCompleteness(values).sections[5];
      expect(section.complete).toBe(true);
    });
  });
});
