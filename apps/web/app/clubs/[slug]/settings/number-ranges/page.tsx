import { checkClubAccess } from '@/lib/check-club-access';
import { NumberRangesSettingsClient } from './_client';

interface NumberRangesPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Number ranges settings page with server-side access check.
 * Returns proper 404 status if user doesn't have access.
 */
export default async function NumberRangesSettingsPage({ params }: NumberRangesPageProps) {
  const { slug } = await params;

  // Server-side access check - throws notFound() with proper 404 status
  await checkClubAccess(slug);

  return <NumberRangesSettingsClient />;
}
