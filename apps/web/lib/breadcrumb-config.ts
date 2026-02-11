/**
 * German route-to-label mapping for breadcrumb navigation.
 * Maps URL path segments to their German display labels.
 */
const segmentLabels: Record<string, string> = {
  // Main navigation
  dashboard: 'Übersicht',
  members: 'Mitglieder',
  settings: 'Einstellungen',
  accounting: 'Buchhaltung',

  // Settings sub-pages
  users: 'Benutzer',
  'number-ranges': 'Nummernkreise',
  clubs: 'Vereine',
  tiers: 'Tarife',
  invites: 'Einladungen',
  profile: 'Profil',
  'my-clubs': 'Meine Vereine',
  notifications: 'Benachrichtigungen',

  // Admin
  admin: 'Kommandozentrale',

  // Finance / Accounting
  households: 'Haushalte',
  fees: 'Beiträge',
  sepa: 'SEPA',
  reports: 'Berichte',
  receipts: 'Belege',
  accounts: 'Kontenplan',
  hours: 'Arbeitsstunden',
};

/**
 * Returns the German display label for a URL path segment.
 * If no mapping exists, the segment is returned with first letter capitalized.
 */
export function getBreadcrumbLabel(segment: string): string {
  const label = segmentLabels[segment];
  if (label) return label;

  // Fallback: capitalize first letter, replace hyphens with spaces
  return segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
