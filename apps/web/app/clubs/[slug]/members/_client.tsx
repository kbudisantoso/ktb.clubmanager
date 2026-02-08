'use client';

import { Suspense, useState, useMemo, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useDebounce } from '@/hooks/use-debounce';
import { useMembersInfinite } from '@/hooks/use-members';
import { useNumberRanges } from '@/hooks/use-number-ranges';
import { MemberSearch } from '@/components/members/member-search';
import { MemberEmptyState } from '@/components/members/member-empty-state';
import { MemberListTable } from '@/components/members/member-list-table';
import { MemberCreateSheet } from '@/components/members/member-create-sheet';
import { MemberDetailPanel, useMemberPanelUrl } from '@/components/members/member-detail-panel';
import { MemberBulkActions } from '@/components/members/member-bulk-actions';

/** Status filter options */
const STATUS_FILTERS = [
  { value: undefined, label: 'Alle' },
  { value: 'ACTIVE', label: 'Aktiv' },
  { value: 'INACTIVE', label: 'Inaktiv' },
  { value: 'PENDING', label: 'Ausstehend' },
  { value: 'LEFT', label: 'Ausgetreten' },
] as const;

/**
 * Inner content component that uses useSearchParams (via useMemberPanelUrl).
 * Must be wrapped in Suspense boundary.
 */
function MembersClientInner() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  // Search state with debounce
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Status filter state
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  // Create sheet state
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Detail panel URL sync
  const { selectedMemberId, selectMember, closePanel } = useMemberPanelUrl();

  // Active row index for keyboard navigation
  const [activeRowIndex, setActiveRowIndex] = useState<number>(-1);

  // Data fetching
  const {
    data,
    isLoading: isMembersLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useMembersInfinite(slug, debouncedSearch || undefined, statusFilter);

  const { data: numberRanges, isLoading: isNumberRangesLoading } = useNumberRanges(slug);

  // Flatten pages into a single array
  const members = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);

  // Total count from the first page
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  // Check if MEMBER number range exists
  const hasMemberNumberRange = useMemo(
    () => (numberRanges ?? []).some((r) => r.entityType === 'MEMBER'),
    [numberRanges]
  );

  // Determine empty state variant
  const emptyStateVariant = useMemo(() => {
    if (!isNumberRangesLoading && !hasMemberNumberRange) return 'no-number-ranges' as const;
    if (members.length === 0 && !debouncedSearch && !statusFilter) return 'no-members' as const;
    if (members.length === 0 && (debouncedSearch || statusFilter)) return 'no-results' as const;
    return null;
  }, [isNumberRangesLoading, hasMemberNumberRange, members.length, debouncedSearch, statusFilter]);

  // Clear search handler for empty state
  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setStatusFilter(undefined);
  }, []);

  // Handle member row click - opens detail panel
  const handleSelectMember = useCallback(
    (id: string) => {
      selectMember(id);
    },
    [selectMember]
  );

  // Reset selection when search/filter changes
  useEffect(() => {
    setSelectedIds(new Set());
    setActiveRowIndex(-1);
  }, [debouncedSearch, statusFilter]);

  // Keyboard navigation: J/K for rows, Enter to open detail, Escape to close panel
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'Escape' && selectedMemberId) {
        // Don't close the panel when a Radix dialog is open — the dialog handles its own Escape
        if (document.querySelector('[role="dialog"][data-state="open"]')) return;
        e.preventDefault();
        closePanel();
      } else if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveRowIndex((prev) => Math.min(prev + 1, members.length - 1));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveRowIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && activeRowIndex >= 0 && activeRowIndex < members.length) {
        e.preventDefault();
        handleSelectMember(members[activeRowIndex].id);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeRowIndex, members, handleSelectMember, selectedMemberId, closePanel]);

  const isLoading = isMembersLoading || isNumberRangesLoading;
  const isPanelOpen = !!selectedMemberId;

  /** The list content (header, search, table) */
  const listContent = (
    <div className="py-6 px-4 space-y-4 h-full overflow-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mitglieder</h1>
          {!isLoading && totalCount > 0 && (
            <p className="text-muted-foreground text-sm">
              {totalCount} {totalCount === 1 ? 'Mitglied' : 'Mitglieder'}
            </p>
          )}
        </div>
        <Button disabled={!hasMemberNumberRange} onClick={() => setIsCreateSheetOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Neues Mitglied
        </Button>
      </div>

      {/* Search and filters - only show when we have number ranges and data or are searching */}
      {(hasMemberNumberRange || members.length > 0) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <MemberSearch value={searchTerm} onChange={setSearchTerm} />

          {/* Status filter buttons */}
          <div className="flex items-center gap-1 flex-wrap">
            {STATUS_FILTERS.map((filter) => (
              <Button
                key={filter.label}
                variant={statusFilter === filter.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(filter.value)}
                className="text-xs"
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Empty states or table */}
      {!isLoading && emptyStateVariant ? (
        <MemberEmptyState
          variant={emptyStateVariant}
          onCreateMember={() => setIsCreateSheetOpen(true)}
          onClearSearch={handleClearSearch}
        />
      ) : (
        <MemberListTable
          members={members}
          isLoading={isLoading}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage ?? false}
          fetchNextPage={fetchNextPage}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onSelectMember={handleSelectMember}
        />
      )}

      {/* Quick-create member sheet */}
      <MemberCreateSheet slug={slug} open={isCreateSheetOpen} onOpenChange={setIsCreateSheetOpen} />

      {/* Floating bulk actions bar */}
      <MemberBulkActions
        selectedIds={selectedIds}
        members={members}
        totalCount={totalCount}
        onClearSelection={() => setSelectedIds(new Set())}
      />
    </div>
  );

  // When panel is open on desktop, use ResizablePanelGroup
  if (isPanelOpen) {
    return (
      <div className="h-[calc(100vh-4rem)]">
        <ResizablePanelGroup orientation="horizontal">
          {/* List panel */}
          <ResizablePanel defaultSize={55} minSize={30}>
            {listContent}
          </ResizablePanel>

          {/* Resize handle */}
          <ResizableHandle withHandle />

          {/* Detail panel */}
          <ResizablePanel defaultSize={45} minSize={30}>
            <div className="h-full overflow-auto border-l">
              <MemberDetailPanel selectedMemberId={selectedMemberId} onClose={closePanel} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  }

  // No panel open - full-width list
  return <div className="container mx-auto">{listContent}</div>;
}

/**
 * Client component orchestrating the member list page.
 * Handles search, status filtering, infinite scroll, detail panel, and empty states.
 * Wrapped in Suspense because useMemberPanelUrl uses useSearchParams.
 */
export function MembersClient() {
  return (
    <Suspense fallback={<MembersLoadingFallback />}>
      <MembersClientInner />
    </Suspense>
  );
}

/** Loading fallback for Suspense boundary */
function MembersLoadingFallback() {
  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mitglieder</h1>
        </div>
      </div>
    </div>
  );
}
