import type { SettingsFormValues } from '@/components/settings/club-settings-form';

export interface SectionCompleteness {
  id: string;
  label: string;
  filled: number;
  total: number;
  complete: boolean;
  hint: string;
}

export interface SettingsCompletenessResult {
  sections: SectionCompleteness[];
  totalFilled: number;
  totalFields: number;
  percentage: number;
}

/** Check if a string field has a non-empty value */
function filled(value: string | null | undefined): boolean {
  return !!value && value.trim().length > 0;
}

/**
 * Compute how complete the club settings are.
 * Each section tracks individual field progress. The overall percentage
 * is the sum of filled fields across all sections.
 */
export function computeSettingsCompleteness(
  values: SettingsFormValues
): SettingsCompletenessResult {
  const sections: SectionCompleteness[] = [
    checkBasicInfo(values),
    checkAddressContact(values),
    checkRegistry(values),
    checkTax(values),
    checkBank(values),
    checkDefaults(values),
  ];

  const totalFilled = sections.reduce((sum, s) => sum + s.filled, 0);
  const totalFields = sections.reduce((sum, s) => sum + s.total, 0);

  return {
    sections,
    totalFilled,
    totalFields,
    percentage: totalFields > 0 ? Math.round((totalFilled / totalFields) * 100) : 0,
  };
}

function checkBasicInfo(v: SettingsFormValues): SectionCompleteness {
  const fields = [filled(v.name), filled(v.shortCode), filled(v.foundedAt)];
  const count = fields.filter(Boolean).length;
  const total = fields.length;

  let hint = '';
  if (!filled(v.shortCode)) {
    hint = 'Vereinskürzel angeben';
  } else if (!filled(v.foundedAt)) {
    hint = 'Gründungsdatum angeben';
  }

  return {
    id: 'section-basic-info',
    label: 'Stammdaten',
    filled: count,
    total,
    complete: count === total,
    hint,
  };
}

function checkAddressContact(v: SettingsFormValues): SectionCompleteness {
  const addressFields = [
    filled(v.street),
    filled(v.houseNumber),
    filled(v.postalCode),
    filled(v.city),
  ];
  const hasContact = filled(v.email) || filled(v.phone);
  const count = addressFields.filter(Boolean).length + (hasContact ? 1 : 0);
  const total = 5; // 4 address + 1 contact

  let hint = '';
  const addressCount = addressFields.filter(Boolean).length;
  if (addressCount < 4) {
    hint = 'Adresse vervollständigen';
  } else if (!hasContact) {
    hint = 'E-Mail oder Telefon angeben';
  }

  return {
    id: 'section-address-contact',
    label: 'Adresse & Kontakt',
    filled: count,
    total,
    complete: count === total,
    hint,
  };
}

function checkRegistry(v: SettingsFormValues): SectionCompleteness {
  const hasPurpose = !!v.clubPurpose;
  const hasForm = !!v.clubSpecialForm;
  const needsRegistry = !!v.isRegistered;

  let count = (hasPurpose ? 1 : 0) + (hasForm ? 1 : 0);
  let total = 2;

  if (needsRegistry) {
    total += 2;
    count += (filled(v.registryCourt) ? 1 : 0) + (filled(v.registryNumber) ? 1 : 0);
  }

  let hint = '';
  if (!hasPurpose) {
    hint = 'Zweckbestimmung auswählen';
  } else if (!hasForm) {
    hint = 'Sonderform auswählen';
  } else if (needsRegistry && !filled(v.registryCourt)) {
    hint = 'Registergericht angeben';
  } else if (needsRegistry && !filled(v.registryNumber)) {
    hint = 'Registernummer angeben';
  }

  return {
    id: 'section-registry',
    label: 'Vereinsregister',
    filled: count,
    total,
    complete: count === total,
    hint,
  };
}

function checkTax(v: SettingsFormValues): SectionCompleteness {
  // Two paths to completion: (taxNumber + taxOffice) OR vatId
  // Track as 2 checkpoints so partial progress is visible
  const hasTaxNumber = filled(v.taxNumber);
  const hasTaxOffice = filled(v.taxOffice);
  const hasVat = filled(v.vatId);
  const total = 2;

  let count: number;
  if (hasVat) {
    // vatId alone satisfies both checkpoints
    count = 2;
  } else {
    count = (hasTaxNumber ? 1 : 0) + (hasTaxOffice ? 1 : 0);
  }

  let hint = '';
  if (count < total) {
    if (!hasTaxNumber && !hasVat) {
      hint = 'Steuernummer oder USt-IdNr. angeben';
    } else if (hasTaxNumber && !hasTaxOffice) {
      hint = 'Finanzamt angeben';
    }
  }

  return {
    id: 'section-tax',
    label: 'Steuerdaten',
    filled: count,
    total,
    complete: count === total,
    hint,
  };
}

function checkBank(v: SettingsFormValues): SectionCompleteness {
  const hasIban = filled(v.iban);
  const hasHolder = filled(v.accountHolder);
  const count = (hasIban ? 1 : 0) + (hasHolder ? 1 : 0);
  const total = 2;

  let hint = '';
  if (!hasIban) {
    hint = 'IBAN angeben';
  } else if (!hasHolder) {
    hint = 'Kontoinhaber angeben';
  }

  return {
    id: 'section-bank',
    label: 'Bankverbindung',
    filled: count,
    total,
    complete: count === total,
    hint,
  };
}

function checkDefaults(v: SettingsFormValues): SectionCompleteness {
  const hasMonth = v.fiscalYearStartMonth != null;
  const hasType = !!v.defaultMembershipType;
  const count = (hasMonth ? 1 : 0) + (hasType ? 1 : 0);
  const total = 2;

  let hint = '';
  if (!hasMonth) {
    hint = 'Geschäftsjahrbeginn festlegen';
  } else if (!hasType) {
    hint = 'Standard-Mitgliedsart auswählen';
  }

  return {
    id: 'section-defaults',
    label: 'Vereinsvorgaben',
    filled: count,
    total,
    complete: count === total,
    hint,
  };
}
