'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { X, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useMember } from '@/hooks/use-member-detail';
import { MemberDetailHeader } from './member-detail-header';

// ============================================================================
// Constants
// ============================================================================

/** Breakpoint for switching between panel and sheet modes */
const MOBILE_BREAKPOINT = 768;

/** Tab definitions for the detail view */
const TABS = [
  { value: 'stammdaten', label: 'Stammdaten' },
  { value: 'adresse', label: 'Adresse & Kontakt' },
  { value: 'mitgliedschaft', label: 'Mitgliedschaft' },
  { value: 'notizen', label: 'Notizen' },
] as const;

// ============================================================================
// Types
// ============================================================================

interface MemberDetailPanelProps {
  /** The currently selected member ID */
  selectedMemberId: string | null;
  /** Called when the panel should close */
  onClose: () => void;
}

// ============================================================================
// Hook: useIsMobile
// ============================================================================

/**
 * Detect if the viewport is below the mobile breakpoint.
 * Returns false during SSR for hydration safety.
 */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    setIsMobile(mediaQuery.matches);

    function handleChange(e: MediaQueryListEvent) {
      setIsMobile(e.matches);
    }

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isMobile;
}

// ============================================================================
// Detail Content (shared between panel and sheet)
// ============================================================================

interface DetailContentProps {
  memberId: string;
  onClose: () => void;
  showFullPageLink?: boolean;
}

function DetailContent({ memberId, onClose, showFullPageLink = true }: DetailContentProps) {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { data: member, isLoading, isError } = useMember(slug, memberId);

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (isError || !member) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground p-6">
        <p className="text-sm">Mitglied nicht gefunden</p>
        <Button variant="outline" size="sm" onClick={onClose}>
          Schliessen
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top toolbar */}
      <div className="flex items-center justify-between p-4 border-b">
        {showFullPageLink && (
          <Link
            href={`/clubs/${slug}/members/${member.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            In voller Seite oeffnen
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 ml-auto"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Panel schliessen</span>
        </Button>
      </div>

      {/* Header */}
      <div className="p-4 border-b">
        <MemberDetailHeader
          member={member}
          slug={slug}
          avatarSize="md"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="stammdaten" className="flex-1 flex flex-col min-h-0">
        <div className="px-4 pt-2 border-b">
          <TabsList variant="line" className="w-full justify-start">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4">
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
        </ScrollArea>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Tab Placeholder
// ============================================================================

function TabPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-40 rounded-lg border border-dashed text-muted-foreground text-sm">
      {label} - Inhalte werden in Plan 11 implementiert
    </div>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function DetailSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-7 rounded" />
      </div>
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Member detail panel that shows member details in a resizable side panel
 * (desktop) or a Sheet overlay (mobile).
 *
 * This component is rendered conditionally when a member is selected.
 * The resizable panel layout is managed by the parent (_client.tsx).
 * On mobile, this switches to a Sheet overlay automatically.
 */
export function MemberDetailPanel({ selectedMemberId, onClose }: MemberDetailPanelProps) {
  const isMobile = useIsMobile();

  if (!selectedMemberId) return null;

  // Mobile: Use Sheet overlay
  if (isMobile) {
    return (
      <Sheet open={!!selectedMemberId} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0" showCloseButton={false}>
          <SheetHeader className="sr-only">
            <SheetTitle>Mitglied Details</SheetTitle>
          </SheetHeader>
          <DetailContent
            memberId={selectedMemberId}
            onClose={onClose}
            showFullPageLink={true}
          />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Render panel content directly (parent wraps in ResizablePanel)
  return (
    <DetailContent
      memberId={selectedMemberId}
      onClose={onClose}
      showFullPageLink={true}
    />
  );
}

// ============================================================================
// URL Sync Hook
// ============================================================================

/**
 * Hook to sync the selected member ID with the URL search param ?member=[id].
 * - On mount: reads ?member from URL and returns it
 * - On selection: updates URL without full navigation
 * - On close: removes ?member from URL
 */
export function useMemberPanelUrl() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Sync from URL on mount
  useEffect(() => {
    const memberParam = searchParams.get('member');
    if (memberParam) {
      setSelectedMemberId(memberParam);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- Only on mount

  // Select a member (updates URL)
  const selectMember = useCallback(
    (id: string) => {
      setSelectedMemberId(id);
      const params = new URLSearchParams(searchParams.toString());
      params.set('member', id);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Close the panel (removes ?member from URL)
  const closePanel = useCallback(() => {
    setSelectedMemberId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('member');
    const queryString = params.toString();
    router.replace(queryString ? `?${queryString}` : '?', { scroll: false });
  }, [router, searchParams]);

  return {
    selectedMemberId,
    selectMember,
    closePanel,
  };
}
