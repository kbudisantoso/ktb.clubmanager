'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { useClubStore, type ClubContext } from '@/lib/club-store';
import { Loader2 } from 'lucide-react';

export default function ClubLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const { setActiveClub, clubs, setClubs } = useClubStore();

  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  const slug = params.slug as string;

  useEffect(() => {
    if (sessionLoading) return;

    if (!session?.user) {
      router.push(`/login?callbackUrl=/clubs/${slug}/dashboard`);
      return;
    }

    checkAccess();
  }, [session, sessionLoading, slug]);

  async function checkAccess() {
    try {
      // Fetch user's clubs if not loaded
      if (clubs.length === 0) {
        const res = await fetch('/api/clubs/my', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setClubs(
            data.map((club: ClubContext & { avatarUrl?: string }) => ({
              id: club.id,
              name: club.name,
              slug: club.slug,
              role: club.role,
              avatarUrl: club.avatarUrl,
              avatarInitials: club.avatarInitials,
              avatarColor: club.avatarColor,
            }))
          );

          // Check if user has access to this club
          const club = data.find(
            (c: ClubContext & { avatarUrl?: string }) => c.slug === slug
          );
          if (club) {
            setActiveClub(slug);
            setHasAccess(true);
          } else {
            router.push('/dashboard');
          }
        }
      } else {
        const club = clubs.find((c) => c.slug === slug);
        if (club) {
          setActiveClub(slug);
          setHasAccess(true);
        } else {
          router.push('/dashboard');
        }
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (sessionLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAccess) {
    return null; // Will redirect
  }

  return <>{children}</>;
}
