import { checkClubAccess } from '@/lib/check-club-access';
import { MemberDetailClient } from './_client';

interface MemberDetailPageProps {
  params: Promise<{ slug: string; id: string }>;
}

/**
 * Full-page member detail view with server-side access check.
 * Returns proper 404 status if user doesn't have access.
 */
export default async function MemberDetailPage({ params }: MemberDetailPageProps) {
  const { slug, id } = await params;

  // Server-side access check - throws notFound() with proper 404 status
  await checkClubAccess(slug);

  return <MemberDetailClient slug={slug} memberId={id} />;
}
