import { checkClubAccess } from '@/lib/check-club-access';
import { MembersClient } from './_client';

interface MembersPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Member list page with server-side access check.
 * Returns proper 404 status if user doesn't have access.
 */
export default async function MembersPage({ params }: MembersPageProps) {
  const { slug } = await params;

  // Server-side access check - throws notFound() with proper 404 status
  await checkClubAccess(slug);

  return <MembersClient />;
}
