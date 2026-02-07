'use client';

import Link from 'next/link';
import { useSessionQuery } from '@/hooks/use-session';
import { UserMenu } from '@/components/auth/user-menu';

/**
 * Auth-aware header actions for public pages.
 * Shows UserMenu when logged in, "Anmelden" link when not.
 */
export function PublicHeaderAuth() {
  const { data: session, isLoading } = useSessionQuery();

  // Show nothing while loading to avoid flash
  if (isLoading) {
    return <div className="w-8 h-8" />; // Placeholder for layout stability
  }

  // Show UserMenu if logged in
  if (session?.user) {
    return <UserMenu />;
  }

  // Show login link if not logged in
  return (
    <Link
      href="/login"
      className="text-sm text-foreground/80 hover:text-foreground transition-colors"
    >
      Anmelden
    </Link>
  );
}
