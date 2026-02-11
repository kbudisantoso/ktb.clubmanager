import { Header } from '@/components/layout/header';
import { ClubLayoutClient } from './_layout-client';

/**
 * Club layout - Server component.
 *
 * Access control is handled by checkClubAccess in individual page components,
 * which properly returns 404 status codes when access is denied.
 *
 * Client-side effects (active club, permissions) are handled by ClubLayoutClient.
 */
export default function ClubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 glass-panel rounded-none border-x-0 border-b-0">
        <ClubLayoutClient>{children}</ClubLayoutClient>
      </main>
    </div>
  );
}
