'use client';

import { useRef, useCallback, useEffect } from 'react';
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
import { MemberStatusBadge } from './member-status-badge';
import { MemberAvatar } from './member-avatar';
import { HouseholdBadge } from './household-badge';

/** Membership type German labels */
const MEMBERSHIP_TYPE_LABELS: Record<string, string> = {
  ORDENTLICH: 'Ordentlich',
  PASSIV: 'Passiv',
  EHREN: 'Ehren',
  FOERDER: 'Förder',
  JUGEND: 'Jugend',
};

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
  householdId: string | null;
  householdRole: string | null;
  household: { id: string; name: string } | null;
  membershipPeriods: {
    id: string;
    joinDate: string | null;
    leaveDate: string | null;
    membershipType: string;
  }[];
  notes: string | null;
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
}

/**
 * Member list table with 9 responsive columns, checkbox selection,
 * column visibility control, and infinite scroll via intersection observer.
 */
/** Responsive breakpoint classes for each toggleable column */
const COLUMN_BREAKPOINTS: Record<ColumnKey, string> = {
  memberNumber: 'hidden md:table-cell',
  status: 'hidden md:table-cell',
  email: 'hidden xl:table-cell',
  phone: 'hidden xl:table-cell',
  household: 'hidden xl:table-cell',
  membershipType: 'hidden xl:table-cell',
  joinDate: 'hidden xl:table-cell',
  notes: 'hidden xl:table-cell',
};

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
}: MemberListTableProps) {
  const lastShiftClickIndex = useRef<number | null>(null);

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
            <TableHead>Name</TableHead>
            <TableHead className={colClass('memberNumber')}>Nr.</TableHead>
            <TableHead className={colClass('status')}>Status</TableHead>
            <TableHead className={colClass('email')}>E-Mail</TableHead>
            <TableHead className={colClass('phone')}>Telefon</TableHead>
            <TableHead className={colClass('household')}>Haushalt</TableHead>
            <TableHead className={colClass('membershipType')}>Beitragsart</TableHead>
            <TableHead className={colClass('joinDate')}>Eintritt</TableHead>
            <TableHead className={colClass('notes')}>Notizen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-4" />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </TableCell>
              <TableCell className={colClass('memberNumber')}>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell className={colClass('status')}>
                <Skeleton className="h-5 w-16 rounded-md" />
              </TableCell>
              <TableCell className={colClass('email')}>
                <Skeleton className="h-4 w-40" />
              </TableCell>
              <TableCell className={colClass('phone')}>
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell className={colClass('household')}>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell className={colClass('membershipType')}>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell className={colClass('joinDate')}>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell className={colClass('notes')}>
                <Skeleton className="h-4 w-24" />
              </TableCell>
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
            <TableHead>Name</TableHead>
            <TableHead className={colClass('memberNumber')}>Nr.</TableHead>
            <TableHead className={colClass('status')}>Status</TableHead>
            <TableHead className={colClass('email')}>E-Mail</TableHead>
            <TableHead className={colClass('phone')}>Telefon</TableHead>
            <TableHead className={colClass('household')}>Haushalt</TableHead>
            <TableHead className={colClass('membershipType')}>Beitragsart</TableHead>
            <TableHead className={colClass('joinDate')}>Eintritt</TableHead>
            <TableHead className={colClass('notes')}>Notizen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member, index) => {
            const isSelected = selectedIds.has(member.id);
            const activePeriod = getActivePeriod(member.membershipPeriods);
            const displayPhone = member.mobile || member.phone;
            const displayName = getDisplayName(member);

            return (
              <TableRow
                key={member.id}
                data-state={isSelected ? 'selected' : undefined}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`Mitglied ${displayName} oeffnen`}
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

                {/* Name - always visible */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <MemberAvatar
                      memberId={member.id}
                      firstName={member.firstName}
                      lastName={member.lastName}
                      organizationName={member.organizationName}
                      personType={member.personType}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{displayName}</div>
                      {/* Household badge below name */}
                      {member.household && (
                        <div className="mt-0.5">
                          <HouseholdBadge
                            name={member.household.name}
                            householdId={member.household.id}
                          />
                        </div>
                      )}
                      {/* Show status on mobile since column is hidden */}
                      <div className="md:hidden mt-0.5">
                        <MemberStatusBadge status={member.status} />
                      </div>
                    </div>
                  </div>
                </TableCell>

                {/* Nr. */}
                <TableCell className={colClass('memberNumber')}>
                  <code className="text-sm font-mono">{member.memberNumber}</code>
                </TableCell>

                {/* Status */}
                <TableCell className={colClass('status')}>
                  <MemberStatusBadge status={member.status} />
                </TableCell>

                {/* E-Mail */}
                <TableCell className={colClass('email')}>
                  <span className="truncate block max-w-48">{member.email ?? '-'}</span>
                </TableCell>

                {/* Telefon */}
                <TableCell className={colClass('phone')}>{displayPhone ?? '-'}</TableCell>

                {/* Haushalt */}
                <TableCell className={colClass('household')}>
                  {member.household ? (
                    <HouseholdBadge
                      name={member.household.name}
                      householdId={member.household.id}
                    />
                  ) : (
                    '-'
                  )}
                </TableCell>

                {/* Beitragsart */}
                <TableCell className={colClass('membershipType')}>
                  {activePeriod
                    ? (MEMBERSHIP_TYPE_LABELS[activePeriod.membershipType] ??
                      activePeriod.membershipType)
                    : '-'}
                </TableCell>

                {/* Eintritt */}
                <TableCell className={colClass('joinDate')}>
                  {activePeriod?.joinDate ? formatDate(activePeriod.joinDate) : '-'}
                </TableCell>

                {/* Notizen */}
                <TableCell className={colClass('notes')}>
                  <span className="text-muted-foreground text-sm truncate block max-w-48">
                    {member.notes ? truncateText(member.notes, 30) : '-'}
                  </span>
                </TableCell>
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
 * Active period has no leaveDate (null = current).
 * Falls back to the most recent period.
 */
function getActivePeriod(
  periods: MemberListItem['membershipPeriods']
): MemberListItem['membershipPeriods'][number] | null {
  if (periods.length === 0) return null;

  // Find period with no leaveDate (current/active period)
  const current = periods.find((p) => !p.leaveDate);
  if (current) return current;

  // Fall back to most recent by joinDate
  return periods.sort((a, b) => {
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
