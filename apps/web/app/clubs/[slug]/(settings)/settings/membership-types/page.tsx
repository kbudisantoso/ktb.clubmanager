import { checkClubAccess } from '@/lib/check-club-access';
import { MembershipTypesSettingsClient } from './_client';

interface MembershipTypesPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Membership types settings page with server-side access check.
 * Returns proper 404 status if user doesn't have access.
 */
export default async function MembershipTypesSettingsPage({ params }: MembershipTypesPageProps) {
  const { slug } = await params;

  // Server-side access check - throws notFound() with proper 404 status
  await checkClubAccess(slug);

  return <MembershipTypesSettingsClient />;
}
