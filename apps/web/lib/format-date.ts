/**
 * Shared date formatting and duration calculation utilities.
 * Used by member timeline components and membership tab.
 */

/**
 * Format an ISO date string to German DD.MM.YYYY format.
 */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('T')[0].split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}.${month}.${year}`;
}

/**
 * Format an ISO datetime string to German DD.MM.YYYY HH:mm format.
 */
export function formatDateTime(isoDate: string): string {
  const datePart = formatDate(isoDate);
  const timePart = isoDate.split('T')[1];
  if (!timePart) return datePart;
  const [hours, minutes] = timePart.split(':');
  if (!hours || !minutes) return datePart;
  return `${datePart} ${hours}:${minutes}`;
}

/**
 * Calculate duration between two dates as "X Jahre, Y Monate" (German).
 * Uses today if leaveDate is null (open/active period).
 */
export function calculateDuration(
  joinDate: string | null,
  leaveDate: string | null
): string | null {
  if (!joinDate) return null;

  const start = new Date(joinDate + 'T00:00:00');
  const end = leaveDate ? new Date(leaveDate + 'T00:00:00') : new Date();

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();

  if (months < 0) {
    years--;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years} ${years === 1 ? 'Jahr' : 'Jahre'}`);
  }
  if (months > 0) {
    parts.push(`${months} ${months === 1 ? 'Monat' : 'Monate'}`);
  }

  if (parts.length === 0) {
    // Less than a month
    const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return `${days} ${days === 1 ? 'Tag' : 'Tage'}`;
  }

  return parts.join(', ');
}

/**
 * Get today's date as YYYY-MM-DD string.
 */
export function getTodayISO(): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
