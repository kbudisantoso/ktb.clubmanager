import { ClubLayoutClient } from './_layout-client';

/**
 * Club layout - Server component.
 *
 * This shared layout wraps all club sub-routes (main pages and settings).
 * It handles:
 * - Setting active club via ClubLayoutClient
 * - Pre-fetching permissions
 *
 * The AppShell (sidebar) is provided by child route groups:
 * - (club)/layout.tsx → AppSidebar (main club pages)
 * - (settings)/layout.tsx → SettingsSidebar (club settings)
 *
 * Access control is handled by checkClubAccess in individual page components.
 */
export default function ClubLayout({ children }: { children: React.ReactNode }) {
  return <ClubLayoutClient>{children}</ClubLayoutClient>;
}
