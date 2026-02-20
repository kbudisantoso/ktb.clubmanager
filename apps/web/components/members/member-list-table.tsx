'use client';

import { type ReactNode, useRef, useCallback, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import type { ColumnKey } from '@/hooks/use-column-visibility';
import { DEFAULT_COLUMN_ORDER } from '@/hooks/use-column-visibility';
import type { MembershipType } from '@/hooks/use-membership-types';
import { MemberStatusBadge } from './member-status-badge';
import { MemberAvatar } from './member-avatar';
import { HouseholdBadge } from './household-badge';

/** Member data as returned from the API */
interface MemberListItem {
  id: string;
  clubId: string;
  memberNumber: string;
  personType: string;
  salutation: string | null;
  title: string | null;
  firstName: string;
  lastName: string;
  nickname: string | null;
  organizationName: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  status: string;
  userImage: string | null;
  userId: string | null;
  householdId: string | null;
  householdRole: string | null;
  household: { id: string; name: string } | null;
  membershipPeriods: {
    id: string;
    joinDate: string | null;
    leaveDate: string | null;
    membershipTypeId?: string | null;
  }[];
  notes: string | null;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

interface MemberListTableProps {
  /** Array of members to display */
  members: MemberListItem[];
  /** Whether initial data is loading */
  isLoading: boolean;
  /** Whether next page is being fetched */
  isFetchingNextPage: boolean;
  /** Whether there are more pages to load */
  hasNextPage: boolean;
  /** Function to fetch the next page */
  fetchNextPage: () => void;
  /** Currently selected member IDs */
  selectedIds: Set<string>;
  /** Called when selection changes */
  onSelectionChange: (ids: Set<string>) => void;
  /** Called when a member row is clicked */
  onSelectMember: (id: string) => void;
  /** Column visibility state from useColumnVisibility hook */
  columnVisibility?: Record<ColumnKey, boolean>;
  /** Column display order from useColumnVisibility hook */
  columnOrder?: ColumnKey[];
  /** Available membership types for label resolution */
  membershipTypes?: MembershipType[];
}

// ============================================================================
// Column Definitions
// ============================================================================

/** Responsive breakpoint classes for each column */
const COLUMN_BREAKPOINTS: Record<ColumnKey, string> = {
  name: '',
  memberNumber: 'hidden md:table-cell',
  status: 'hidden md:table-cell',
  email: 'hidden xl:table-cell',
  phone: 'hidden xl:table-cell',
  household: 'hidden xl:table-cell',
  membershipType: 'hidden xl:table-cell',
  joinDate: 'hidden xl:table-cell',
  notes: 'hidden xl:table-cell',
};

interface ColumnDef {
  label: string;
  skeletonClass: string;
  render: (
    member: MemberListItem,
    activePeriod: MemberListItem['membershipPeriods'][number] | null,
    membershipTypes?: MembershipType[]
  ) => ReactNode;
}

const COLUMN_DEFS: Record<ColumnKey, ColumnDef> = {
  name: {
    label: 'Name',
    skeletonClass: '',
    render: (m) => (
      <div className="flex items-center gap-3">
        <MemberAvatar
          memberId={m.id}
          firstName={m.firstName}
          lastName={m.lastName}
          organizationName={m.organizationName}
          personType={m.personType}
          size="sm"
          imageUrl={m.userImage}
          hasLinkedUser={!!m.userId}
        />
        <div className="min-w-0">
          <div className="font-medium truncate">{getDisplayName(m)}</div>
          {/* Show status on mobile since status column is hidden */}
          <div className="md:hidden mt-0.5">
            <MemberStatusBadge status={m.status} />
          </div>
        </div>
      </div>
    ),
  },
  memberNumber: {
    label: 'Nr.',
    skeletonClass: 'h-4 w-16',
    render: (m) => <code className="text-sm font-mono">{m.memberNumber}</code>,
  },
  status: {
    label: 'Status',
    skeletonClass: 'h-5 w-16 rounded-md',
    render: (m) => <MemberStatusBadge status={m.status} />,
  },
  email: {
    label: 'E-Mail',
    skeletonClass: 'h-4 w-40',
    render: (m) => <span className="truncate block max-w-48">{m.email ?? '-'}</span>,
  },
  phone: {
    label: 'Telefon',
    skeletonClass: 'h-4 w-28',
    render: (m) => (m.mobile || m.phone) ?? '-',
  },
  household: {
    label: 'Haushalt',
    skeletonClass: 'h-4 w-20',
    render: (m) =>
      m.household ? <HouseholdBadge name={m.household.name} householdId={m.household.id} /> : '-',
  },
  membershipType: {
    label: 'Mitgliedschaft',
    skeletonClass: 'h-4 w-20',
    render: (_m, activePeriod, membershipTypes) =>
      activePeriod?.membershipTypeId
        ? (membershipTypes?.find((t) => t.id === activePeriod.membershipTypeId)?.name ?? '-')
        : '-',
  },
  joinDate: {
    label: 'Eintritt',
    skeletonClass: 'h-4 w-20',
    render: (_m, activePeriod) =>
      activePeriod?.joinDate ? formatDate(activePeriod.joinDate) : '-',
  },
  notes: {
    label: 'Notizen',
    skeletonClass: 'h-4 w-24',
    render: (m) => (
      <span className="text-muted-foreground text-sm truncate block max-w-48">
        {m.notes ? truncateText(m.notes, 30) : '-'}
      </span>
    ),
  },
};

// ============================================================================
// MemberListTable
// ============================================================================

export function MemberListTable({
  members,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  selectedIds,
  onSelectionChange,
  onSelectMember,
  columnVisibility,
  columnOrder,
  membershipTypes,
}: MemberListTableProps) {
  const lastShiftClickIndex = useRef<number | null>(null);

  // Resolved column order: prop > default
  const orderedColumns = columnOrder ?? DEFAULT_COLUMN_ORDER;

  /**
   * Get the CSS class for a column based on visibility and responsive breakpoints.
   * If user disabled the column, it's always hidden.
   * If user enabled (or no visibility prop), use the responsive breakpoint class.
   */
  const colClass = (key: ColumnKey) => {
    if (columnVisibility && columnVisibility[key] === false) return 'hidden';
    return COLUMN_BREAKPOINTS[key];
  };

  // Intersection observer for infinite scroll sentinel
  const { ref: sentinelRef, inView } = useInView({
    threshold: 0,
    rootMargin: '200px',
  });

  // Trigger next page fetch when sentinel is visible
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  /** Toggle selection for a single member */
  const toggleSelection = useCallback(
    (id: string, index: number, shiftKey: boolean) => {
      const next = new Set(selectedIds);

      if (shiftKey && lastShiftClickIndex.current !== null) {
        // Shift+click range selection
        const start = Math.min(lastShiftClickIndex.current, index);
        const end = Math.max(lastShiftClickIndex.current, index);
        for (let i = start; i <= end; i++) {
          next.add(members[i].id);
        }
      } else {
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }

      lastShiftClickIndex.current = index;
      onSelectionChange(next);
    },
    [selectedIds, members, onSelectionChange]
  );

  /** Toggle select all on current page */
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === members.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(members.map((m) => m.id)));
    }
  }, [selectedIds.size, members, onSelectionChange]);

  // Loading skeleton
  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox disabled />
            </TableHead>
            {orderedColumns.map((key) => (
              <TableHead key={key} className={colClass(key)}>
                {COLUMN_DEFS[key].label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-4" />
              </TableCell>
              {orderedColumns.map((key) =>
                key === 'name' ? (
                  <TableCell key={key} className={colClass(key)}>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-7 w-7 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </TableCell>
                ) : (
                  <TableCell key={key} className={colClass(key)}>
                    <Skeleton className={COLUMN_DEFS[key].skeletonClass} />
                  </TableCell>
                )
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  const allSelected = members.length > 0 && selectedIds.size === members.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < members.length;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={someSelected ? 'indeterminate' : allSelected}
                onCheckedChange={toggleSelectAll}
                aria-label="Alle Mitglieder auswählen"
              />
            </TableHead>
            {orderedColumns.map((key) => (
              <TableHead key={key} className={colClass(key)}>
                {COLUMN_DEFS[key].label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member, index) => {
            const isSelected = selectedIds.has(member.id);
            const activePeriod = getActivePeriod(member.membershipPeriods);
            const displayName = getDisplayName(member);

            return (
              <TableRow
                key={member.id}
                data-state={isSelected ? 'selected' : undefined}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`Mitglied ${displayName} öffnen`}
                onClick={() => onSelectMember(member.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectMember(member.id);
                  }
                }}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelection(member.id, index, false)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (e.shiftKey) {
                        e.preventDefault();
                        toggleSelection(member.id, index, true);
                      }
                    }}
                    aria-label={`${displayName} auswählen`}
                  />
                </TableCell>

                {orderedColumns.map((key) => (
                  <TableCell key={key} className={colClass(key)}>
                    {COLUMN_DEFS[key].render(member, activePeriod, membershipTypes)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" />

      {/* Loading skeleton for next page */}
      {isFetchingNextPage && (
        <div className="space-y-3 p-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16 hidden md:block" />
              <Skeleton className="h-5 w-16 rounded-md hidden md:block" />
              <Skeleton className="h-4 w-40 hidden xl:block" />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Get the display name for a member.
 * LEGAL_ENTITY shows organizationName, NATURAL shows "Nachname, Vorname".
 */
function getDisplayName(member: MemberListItem): string {
  if (member.personType === 'LEGAL_ENTITY' && member.organizationName) {
    return member.organizationName;
  }
  return `${member.lastName}, ${member.firstName}`;
}

/**
 * Get the current (active) membership period.
 * Uses date-range logic: joinDate <= today AND (leaveDate > today OR open).
 * Falls back to the most recent period.
 */
function getActivePeriod(
  periods: MemberListItem['membershipPeriods']
): MemberListItem['membershipPeriods'][number] | null {
  if (periods.length === 0) return null;

  const today = new Date().toISOString().slice(0, 10);

  // Period containing today: joinDate <= today AND (leaveDate > today OR open)
  const current = periods.find(
    (p) => (p.joinDate ?? '') <= today && (!p.leaveDate || p.leaveDate > today)
  );
  if (current) return current;

  // Fall back to most recent by joinDate (e.g. LEFT members where all periods are closed)
  return [...periods].sort((a, b) => {
    const dateA = a.joinDate ?? '';
    const dateB = b.joinDate ?? '';
    return dateB.localeCompare(dateA);
  })[0];
}

/**
 * Format an ISO date string to German DD.MM.YYYY format.
 */
function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}.${month}.${year}`;
}

/**
 * Truncate text to a maximum length with ellipsis.
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export type { MemberListItem };
