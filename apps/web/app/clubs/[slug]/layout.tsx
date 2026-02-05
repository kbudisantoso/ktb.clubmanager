'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSessionQuery } from '@/hooks/use-session';
import { useClubStore } from '@/lib/club-store';
import { fetchAndStorePermissions } from '@/lib/fetch-permissions';
import { useMyClubsQuery } from '@/hooks/use-clubs';
import { Header } from '@/components/layout/header';
import { Loader2 } from 'lucide-react';

export default function ClubLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const { data: session, isLoading: sessionLoading } = useSessionQuery();
  const { data, isLoading: clubsLoading } = useMyClubsQuery();
  const { clubs = [] } = data ?? {};
  const { setActiveClub } = useClubStore();

  const [hasAccess, setHasAccess] = useState(false);

  const slug = params.slug as string;

  useEffect(() => {
    if (sessionLoading || clubsLoading) return;

    if (!session?.user) {
      router.push(`/login?callbackUrl=/clubs/${slug}/dashboard`);
      return;
    }

    // Check if user has access to this club
    const club = clubs.find((c) => c.slug === slug);
    if (club) {
      setActiveClub(slug);
      setHasAccess(true);

      // Fetch permissions if not already loaded for this club
      const hasPermissions = club.permissions && club.permissions.length > 0;
      if (!hasPermissions) {
        fetchAndStorePermissions(slug);
      }
    } else {
      router.push('/dashboard');
    }
  }, [session, sessionLoading, clubsLoading, clubs, slug, setActiveClub, router]);

  if (sessionLoading || clubsLoading) {
    return (
      <>
        <div className="app-background" />
        <div className="relative min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </main>
        </div>
      </>
    );
  }

  if (!hasAccess) {
    return null; // Will redirect
  }

  return (
    <>
      <div className="app-background" />
      <div className="relative min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
      </div>
    </>
  );
}
