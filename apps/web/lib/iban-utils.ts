import { validateIBAN, electronicFormatIBAN } from 'ibantools';
import { bankDataByIBAN } from 'bankdata-germany';

export interface IBANValidationResult {
  valid: boolean;
  error: string | null;
  bankName: string | null;
  bic: string | null;
  electronic: string;
}

/**
 * Validate IBAN format + checksum and look up German bank name.
 * Uses ibantools for validation and bankdata-germany for bank name resolution.
 */
export function validateAndLookupIBAN(ibanInput: string): IBANValidationResult {
  const trimmed = ibanInput.trim();
  if (!trimmed) {
    return { valid: false, error: null, bankName: null, bic: null, electronic: '' };
  }

  const electronic = electronicFormatIBAN(trimmed) ?? trimmed.replace(/\s/g, '').toUpperCase();

  // Need at least 5 chars for country code + check digits + partial BBAN
  if (electronic.length < 5) {
    return { valid: false, error: null, bankName: null, bic: null, electronic };
  }

  const validation = validateIBAN(electronic);
  if (!validation.valid) {
    return {
      valid: false,
      error: 'Ungueltige IBAN',
      bankName: null,
      bic: null,
      electronic,
    };
  }

  // For German IBANs, look up bank name and BIC
  if (electronic.startsWith('DE')) {
    const bankData = bankDataByIBAN(electronic);
    if (bankData) {
      return {
        valid: true,
        error: null,
        bankName: bankData.bankName,
        bic: bankData.bic ?? null,
        electronic,
      };
    }
  }

  return { valid: true, error: null, bankName: null, bic: null, electronic };
}

/**
 * Format IBAN with spaces every 4 characters for display.
 */
export function formatIBAN(iban: string): string {
  const electronic = iban.replace(/\s/g, '').toUpperCase();
  return electronic.replace(/(.{4})/g, '$1 ').trim();
}
