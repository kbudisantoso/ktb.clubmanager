/**
 * German locale money formatting utilities.
 *
 * moneyFormatter — Intl.NumberFormat instance for German locale (1.234,56)
 * formatMoney    — Formats a decimal string as "1.234,56 EUR"
 * formatMoneyValue — Formats a number as "1.234,56" (no currency suffix)
 */

export const moneyFormatter = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(value: string): string {
  return `${moneyFormatter.format(parseFloat(value))} EUR`;
}

export function formatMoneyValue(value: number): string {
  return moneyFormatter.format(value);
}
