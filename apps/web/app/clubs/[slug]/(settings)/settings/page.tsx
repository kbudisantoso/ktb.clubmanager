import { checkClubAccess } from '@/lib/check-club-access';
import { SettingsContent } from './_client';

interface SettingsPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Club settings page with server-side access check.
 * Returns proper 404 status if user doesn't have access.
 */
export default async function ClubSettingsPage({ params }: SettingsPageProps) {
  const { slug } = await params;
  await checkClubAccess(slug);
  return <SettingsContent />;
}
