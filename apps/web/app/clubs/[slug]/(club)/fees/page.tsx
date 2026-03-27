import { checkClubAccess } from '@/lib/check-club-access';
import { FeesClient } from './_client';

interface FeesPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Fee management page with server-side access check.
 * Returns proper 404 status if user doesn't have access.
 */
export default async function FeesPage({ params }: FeesPageProps) {
  const { slug } = await params;

  // Server-side access check - throws notFound() with proper 404 status
  await checkClubAccess(slug);

  return <FeesClient />;
}
