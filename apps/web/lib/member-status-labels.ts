import type { MemberStatus } from '@ktb/shared';

/** German labels for each member status (badges, filters, exports) */
export const STATUS_LABELS: Record<MemberStatus, string> = {
  PENDING: 'Mitgliedschaft beantragt',
  PROBATION: 'Probezeit',
  ACTIVE: 'Aktiv',
  DORMANT: 'Ruhend',
  SUSPENDED: 'Gesperrt',
  LEFT: 'Ausgetreten',
};

/** German labels for left categories */
export const LEFT_CATEGORY_LABELS: Record<string, string> = {
  VOLUNTARY: 'Freiwilliger Austritt',
  EXCLUSION: 'Ausschluss',
  REJECTED: 'Antrag abgelehnt',
  DEATH: 'Tod',
  OTHER: 'Sonstiges',
};

/** Left category options for select/radio inputs */
export const LEFT_CATEGORY_OPTIONS = [
  { value: 'VOLUNTARY' as const, label: 'Freiwilliger Austritt' },
  { value: 'EXCLUSION' as const, label: 'Ausschluss' },
  { value: 'REJECTED' as const, label: 'Antrag abgelehnt' },
  { value: 'DEATH' as const, label: 'Tod' },
  { value: 'OTHER' as const, label: 'Sonstiges' },
] as const;
