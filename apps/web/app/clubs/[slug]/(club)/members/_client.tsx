'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Plus, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { PageHeader } from '@/components/layout/page-header';
import { useDebounce } from '@/hooks/use-debounce';
import { useMemberFilters } from '@/hooks/use-member-filters';
import { useColumnVisibility } from '@/hooks/use-column-visibility';
import { useMembersInfinite } from '@/hooks/use-members';
import { useNumberRanges } from '@/hooks/use-number-ranges';
import { MemberSearch } from '@/components/members/member-search';
import { MemberEmptyState } from '@/components/members/member-empty-state';
import { MemberListTable } from '@/components/members/member-list-table';
import { MemberCreateSheet } from '@/components/members/member-create-sheet';
import { MemberDetailPanel } from '@/components/members/member-detail-panel';
import { MemberBulkActions } from '@/components/members/member-bulk-actions';
import { MemberFilterStatus } from '@/components/members/member-filter-status';
import { MemberFilterHousehold } from '@/components/members/member-filter-household';
import { MemberFilterPeriod } from '@/components/members/member-filter-period';
import { MemberFilterChips } from '@/components/members/member-filter-chips';
import { MemberColumnPicker } from '@/components/members/member-column-picker';

/**
 * Client component orchestrating the member list page.
 * All filter state lives in URL via nuqs (search, status, household, period, member).
 * Column visibility is persisted per club in localStorage.
 * Member detail opens as a Sheet overlay (both mobile and desktop).
 */
export function MembersClient() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  // --- Filter state (URL-synced via nuqs) ---
  const [filters, setFilters] = useMemberFilters();

  // Local search input with debounce before syncing to URL
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Sync debounced search to nuqs URL state
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      setFilters({ search: debouncedSearch });
    }
  }, [debouncedSearch, filters.search, setFilters]);

  // Sync nuqs search back to local input when URL changes externally (e.g. chip clear)
  const filtersSearch = filters.search;
  useEffect(() => {
    setSearchInput((prev) => (prev !== filtersSearch ? filtersSearch : prev));
  }, [filtersSearch]);

  // --- Column visibility (localStorage per club) ---
  const {
    columns: columnVisibility,
    toggleColumn,
    resetColumns,
    isDefault: isColumnsDefault,
  } = useColumnVisibility(slug);

  // --- UI state ---
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeRowIndex, setActiveRowIndex] = useState<number>(-1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // --- Data fetching ---
  const periodYear = filters.period ? Number(filters.period) : undefined;

  const {
    data,
    isLoading: isMembersLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useMembersInfinite(slug, {
    search: debouncedSearch || undefined,
    status: filters.status.length > 0 ? filters.status : undefined,
    household: filters.household || undefined,
    periodYear,
  });

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

  // --- Panel state (via nuqs member param) ---
  const selectedMemberId = filters.member || null;

  const selectMember = useCallback(
    (id: string) => {
      setFilters({ member: id });
    },
    [setFilters]
  );

  const closePanel = useCallback(() => {
    setFilters({ member: '' });
  }, [setFilters]);

  // --- Member navigation (prev/next in detail sheet) ---
  const currentMemberIndex = useMemo(
    () => (selectedMemberId ? members.findIndex((m) => m.id === selectedMemberId) : -1),
    [selectedMemberId, members]
  );

  const navigatePrev = useCallback(() => {
    if (currentMemberIndex > 0) selectMember(members[currentMemberIndex - 1].id);
  }, [currentMemberIndex, members, selectMember]);

  const navigateNext = useCallback(() => {
    if (currentMemberIndex >= 0 && currentMemberIndex < members.length - 1)
      selectMember(members[currentMemberIndex + 1].id);
  }, [currentMemberIndex, members, selectMember]);

  const hasPrev = currentMemberIndex > 0;
  const hasNext = currentMemberIndex >= 0 && currentMemberIndex < members.length - 1;

  // --- Empty state variant ---
  const hasActiveFilters =
    filters.status.length > 0 || filters.household !== '' || filters.period !== '';

  const emptyStateVariant = useMemo(() => {
    if (!isNumberRangesLoading && !hasMemberNumberRange) return 'no-number-ranges' as const;
    if (members.length === 0 && !debouncedSearch && !hasActiveFilters) return 'no-members' as const;
    if (members.length === 0 && (debouncedSearch || hasActiveFilters)) return 'no-results' as const;
    return null;
  }, [
    isNumberRangesLoading,
    hasMemberNumberRange,
    members.length,
    debouncedSearch,
    hasActiveFilters,
  ]);

  // Clear all search/filters handler for empty state
  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    setFilters({ search: '', status: [], household: '', period: '' });
  }, [setFilters]);

  // --- Reset selection when search/filter changes ---
  useEffect(() => {
    setSelectedIds(new Set());
    setActiveRowIndex(-1);
  }, [debouncedSearch, filters.status, filters.household, filters.period]);

  // --- Keyboard navigation ---
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (selectedMemberId) navigateNext();
        else setActiveRowIndex((prev) => Math.min(prev + 1, members.length - 1));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (selectedMemberId) navigatePrev();
        else setActiveRowIndex((prev) => Math.max(prev - 1, 0));
      } else if (
        e.key === 'Enter' &&
        !selectedMemberId &&
        activeRowIndex >= 0 &&
        activeRowIndex < members.length
      ) {
        e.preventDefault();
        selectMember(members[activeRowIndex].id);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeRowIndex, members, selectMember, selectedMemberId, navigatePrev, navigateNext]);

  // --- Computed values ---
  const isLoading = isMembersLoading || isNumberRangesLoading;

  // Count of active filters (for mobile badge)
  const activeFilterCount =
    (filters.status.length > 0 ? 1 : 0) +
    (filters.household !== '' ? 1 : 0) +
    (filters.period !== '' ? 1 : 0);

  // --- Filter dropdowns (shared between desktop and mobile drawer) ---
  const filterDropdowns = (
    <>
      <MemberFilterStatus
        selected={filters.status}
        onSelectionChange={(statuses) => setFilters({ status: statuses })}
      />
      <MemberFilterHousehold
        value={filters.household}
        onChange={(value) => setFilters({ household: value })}
        slug={slug}
      />
      <MemberFilterPeriod
        value={filters.period}
        onChange={(value) => setFilters({ period: value })}
      />
    </>
  );

  const countDescription =
    !isLoading && totalCount > 0
      ? `${totalCount} ${totalCount === 1 ? 'Mitglied' : 'Mitglieder'}`
      : undefined;

  /** The list content (search, filters, table) */
  const listContent = (
    <div className="space-y-4 px-4 pb-6">
      {/* Row 1: Search + Column Picker + Create Button */}
      {(hasMemberNumberRange || members.length > 0) && (
        <div className="flex items-center gap-3">
          <MemberSearch value={searchInput} onChange={setSearchInput} className="flex-1" />
          <MemberColumnPicker
            columns={columnVisibility}
            onToggle={toggleColumn}
            onReset={resetColumns}
            isDefault={isColumnsDefault}
          />
          <Button disabled={!hasMemberNumberRange} onClick={() => setIsCreateSheetOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Neues Mitglied</span>
            <span className="sm:hidden">Neu</span>
          </Button>
        </div>
      )}

      {/* Row 2: Filter dropdowns (desktop) / Filter button (mobile) + Chips */}
      {(hasMemberNumberRange || members.length > 0) && (
        <div className="space-y-2">
          {/* Desktop: inline filter dropdowns */}
          <div className="hidden sm:flex items-center gap-2">{filterDropdowns}</div>

          {/* Mobile: Filter button with Sheet drawer */}
          <div className="sm:hidden">
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <SlidersHorizontal className="mr-1 size-3.5" />
                  Filter
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1 rounded-sm px-1 font-normal">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="pb-8">
                <SheetHeader>
                  <SheetTitle>Filter</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-3 mt-4">{filterDropdowns}</div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Active filter chips */}
          <MemberFilterChips filters={filters} setFilters={setFilters} />
        </div>
      )}

      {/* Empty button for pages without Row 1 (no number ranges, no members) */}
      {!hasMemberNumberRange && members.length === 0 && !isLoading && (
        <div className="flex justify-end">
          <Button disabled onClick={() => setIsCreateSheetOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Neues Mitglied
          </Button>
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
          onSelectMember={selectMember}
          columnVisibility={columnVisibility}
        />
      )}

      {/* Floating bulk actions bar */}
      <MemberBulkActions
        selectedIds={selectedIds}
        members={members}
        totalCount={totalCount}
        onClearSelection={() => setSelectedIds(new Set())}
      />
    </div>
  );

  return (
    <div>
      <PageHeader title="Mitglieder" description={countDescription} />
      <div className="container mx-auto">{listContent}</div>

      {/* Overlays */}
      <MemberCreateSheet slug={slug} open={isCreateSheetOpen} onOpenChange={setIsCreateSheetOpen} />
      <MemberDetailPanel
        selectedMemberId={selectedMemberId}
        onClose={closePanel}
        onNavigatePrev={navigatePrev}
        onNavigateNext={navigateNext}
        hasPrev={hasPrev}
        hasNext={hasNext}
      />
    </div>
  );
}

/** Loading fallback skeleton for the member list page */
export function MembersLoadingFallback() {
  return (
    <div>
      <PageHeader title="Mitglieder" />
      <div className="container mx-auto space-y-4 px-4">
        {/* Row 1 skeleton: Search + Column Picker + Create */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 flex-1 max-w-sm" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-10 w-36" />
        </div>

        {/* Row 2 skeleton: Filter dropdowns */}
        <div className="hidden sm:flex items-center gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>

        {/* Table rows skeleton */}
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16 hidden md:block" />
              <Skeleton className="h-5 w-16 rounded-md hidden md:block" />
              <Skeleton className="h-4 w-40 hidden xl:block" />
              <Skeleton className="h-4 w-28 hidden xl:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
