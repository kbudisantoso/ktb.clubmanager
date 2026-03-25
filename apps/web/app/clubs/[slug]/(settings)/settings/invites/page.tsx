import { checkClubAccess } from '@/lib/check-club-access';
import { InvitesContent } from './_client';

interface InvitesPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ClubInvitesSettingsPage({ params }: InvitesPageProps) {
  const { slug } = await params;
  await checkClubAccess(slug);
  return <InvitesContent />;
}
