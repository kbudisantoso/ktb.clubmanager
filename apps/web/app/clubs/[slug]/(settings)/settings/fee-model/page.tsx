import { checkClubAccess } from '@/lib/check-club-access';
import { FeeModelSettingsClient } from './_client';

interface FeeModelPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Fee model settings page with server-side access check.
 * Manages Beitragsarten, cross-table, and household billing model.
 */
export default async function FeeModelSettingsPage({ params }: FeeModelPageProps) {
  const { slug } = await params;
  await checkClubAccess(slug);
  return <FeeModelSettingsClient />;
}
