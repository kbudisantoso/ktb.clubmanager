'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useMember } from '@/hooks/use-member-detail';
import { MemberDetailHeader } from '@/components/members/member-detail-header';

// ============================================================================
// Constants
// ============================================================================

/** Tab definitions for the full-page detail view */
const TABS = [
  { value: 'stammdaten', label: 'Stammdaten' },
  { value: 'adresse', label: 'Adresse & Kontakt' },
  { value: 'mitgliedschaft', label: 'Mitgliedschaft' },
  { value: 'notizen', label: 'Notizen' },
] as const;

// ============================================================================
// Types
// ============================================================================

interface MemberDetailClientProps {
  /** Club slug */
  slug: string;
  /** Member ID from route params */
  memberId: string;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Full-page member detail client component.
 * Renders the complete member detail view with back navigation,
 * header, and tabbed content areas.
 */
export function MemberDetailClient({ slug, memberId }: MemberDetailClientProps) {
  const router = useRouter();
  const { data: member, isLoading, isError } = useMember(slug, memberId);

  // Keyboard: Escape returns to list
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        router.push(`/clubs/${slug}/members`);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [router, slug]);

  // Loading state
  if (isLoading) {
    return <FullPageSkeleton />;
  }

  // Error / Not found
  if (isError || !member) {
    return (
      <div className="container mx-auto py-12">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <h2 className="text-xl font-semibold">Mitglied nicht gefunden</h2>
          <p className="text-muted-foreground text-sm">
            Das angeforderte Mitglied existiert nicht oder du hast keinen Zugriff.
          </p>
          <button
            onClick={() => router.push(`/clubs/${slug}/members`)}
            className="text-sm text-primary hover:underline"
          >
            Zurueck zur Mitgliederliste
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with back link */}
      <MemberDetailHeader member={member} slug={slug} avatarSize="lg" showBackLink />

      {/* Tabs */}
      <Tabs defaultValue="stammdaten">
        <TabsList variant="line" className="w-full justify-start">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-4">
          <TabsContent value="stammdaten">
            <TabPlaceholder label="Stammdaten" />
          </TabsContent>
          <TabsContent value="adresse">
            <TabPlaceholder label="Adresse & Kontakt" />
          </TabsContent>
          <TabsContent value="mitgliedschaft">
            <TabPlaceholder label="Mitgliedschaft" />
          </TabsContent>
          <TabsContent value="notizen">
            <TabPlaceholder label="Notizen" />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Tab Placeholder
// ============================================================================

function TabPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-64 rounded-lg border border-dashed text-muted-foreground text-sm">
      {label} - Inhalte werden in Plan 11 implementiert
    </div>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function FullPageSkeleton() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Back link skeleton */}
      <Skeleton className="h-4 w-36" />

      {/* Header skeleton */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <Skeleton className="h-9 w-full max-w-md" />

      {/* Content skeleton */}
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}
