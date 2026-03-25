'use client';

import { useCallback, useRef } from 'react';
import { ArrowUpDown } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserStatusBadge } from './user-status-badge';
import { UserRoleBadges } from './user-role-badges';
import type { ClubUserListItem } from '@/hooks/use-club-users';

// ============================================================================
// Types
// ============================================================================

/** Sortable column keys */
export type UserSortKey = 'name' | 'roles' | 'status' | 'joinedAt';

export interface UserSortState {
  key: UserSortKey;
  direction: 'asc' | 'desc';
}

/** Column keys for visibility control */
export type UserColumnKey = 'name' | 'email' | 'roles' | 'status' | 'joinedAt';

interface UserListTableProps {
  /** Array of club users to display */
  users: ClubUserListItem[];
  /** Whether data is loading */
  isLoading: boolean;
  /** Currently selected user IDs */
  selectedIds: Set<string>;
  /** Called when selection changes */
  onSelectionChange: (ids: Set<string>) => void;
  /** Called when a user row is clicked */
  onSelectUser: (id: string) => void;
  /** Current sort state */
  sort?: UserSortState;
  /** Called when a sortable column header is clicked */
  onSortChange?: (sort: UserSortState) => void;
  /** Column visibility state */
  columnVisibility?: Partial<Record<UserColumnKey, boolean>>;
  /** ID of the current user (to show "(Du)" badge) */
  currentUserId?: string;
  /** Club slug for tenant-scoped avatar URLs */
  slug: string;
}

// ============================================================================
// Column Definitions
// ============================================================================

/** Responsive breakpoint classes for each column */
const COLUMN_BREAKPOINTS: Record<UserColumnKey, string> = {
  name: '',
  email: 'hidden md:table-cell',
  roles: 'hidden lg:table-cell',
  status: 'hidden md:table-cell',
  joinedAt: 'hidden xl:table-cell',
};

const COLUMN_ORDER: UserColumnKey[] = ['name', 'email', 'roles', 'status', 'joinedAt'];

const COLUMN_LABELS: Record<UserColumnKey, string> = {
  name: 'Name',
  email: 'E-Mail',
  roles: 'Rollen',
  status: 'Status',
  joinedAt: 'Beitrittsdatum',
};

/** Columns that support sorting */
const SORTABLE_COLUMNS: Set<string> = new Set<string>(['name', 'roles', 'status', 'joinedAt']);

// ============================================================================
// UserListTable
// ============================================================================

export function UserListTable({
  users,
  isLoading,
  selectedIds,
  onSelectionChange,
  onSelectUser,
  sort,
  onSortChange,
  columnVisibility,
  currentUserId,
  slug,
}: UserListTableProps) {
  const lastShiftClickIndex = useRef<number | null>(null);

  /** Get CSS class for a column based on visibility and responsive breakpoints */
  const colClass = (key: UserColumnKey) => {
    if (columnVisibility && columnVisibility[key] === false) return 'hidden';
    return COLUMN_BREAKPOINTS[key];
  };

  /** Get visible columns based on columnVisibility */
  const visibleColumns = COLUMN_ORDER.filter(
    (key) => !columnVisibility || columnVisibility[key] !== false
  );

  /** Toggle selection for a single user */
  const toggleSelection = useCallback(
    (id: string, index: number, shiftKey: boolean) => {
      const next = new Set(selectedIds);

      if (shiftKey && lastShiftClickIndex.current !== null) {
        const start = Math.min(lastShiftClickIndex.current, index);
        const end = Math.max(lastShiftClickIndex.current, index);
        for (let i = start; i <= end; i++) {
          next.add(users[i].id);
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
    [selectedIds, users, onSelectionChange]
  );

  /** Toggle select all */
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === users.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(users.map((u) => u.id)));
    }
  }, [selectedIds.size, users, onSelectionChange]);

  /** Handle sortable column header click */
  const handleSort = (key: UserSortKey) => {
    if (!onSortChange) return;
    if (sort?.key === key) {
      onSortChange({ key, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      onSortChange({ key, direction: 'asc' });
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox disabled />
            </TableHead>
            {visibleColumns.map((key) => (
              <TableHead key={key} className={colClass(key)}>
                {COLUMN_LABELS[key]}
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
              {visibleColumns.map((key) =>
                key === 'name' ? (
                  <TableCell key={key} className={colClass(key)}>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </TableCell>
                ) : key === 'status' ? (
                  <TableCell key={key} className={colClass(key)}>
                    <Skeleton className="h-5 w-16 rounded-md" />
                  </TableCell>
                ) : key === 'roles' ? (
                  <TableCell key={key} className={colClass(key)}>
                    <Skeleton className="h-5 w-20 rounded-md" />
                  </TableCell>
                ) : (
                  <TableCell key={key} className={colClass(key)}>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                )
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  // Empty state
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">Keine Benutzer gefunden</p>
      </div>
    );
  }

  const allSelected = users.length > 0 && selectedIds.size === users.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < users.length;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              checked={someSelected ? 'indeterminate' : allSelected}
              onCheckedChange={toggleSelectAll}
              aria-label="Alle Benutzer ausw\u00e4hlen"
            />
          </TableHead>
          {visibleColumns.map((key) => (
            <TableHead key={key} className={colClass(key)}>
              {SORTABLE_COLUMNS.has(key) ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  onClick={() => handleSort(key as UserSortKey)}
                >
                  {COLUMN_LABELS[key]}
                  <ArrowUpDown className="size-3.5 text-muted-foreground" />
                </button>
              ) : (
                COLUMN_LABELS[key]
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user, index) => {
          const isSelected = selectedIds.has(user.id);
          const isSelf = user.userId === currentUserId;

          return (
            <TableRow
              key={user.id}
              data-state={isSelected ? 'selected' : undefined}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`Benutzer ${user.name} \u00f6ffnen`}
              onClick={() => onSelectUser(user.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectUser(user.id);
                }
              }}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelection(user.id, index, false)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (e.shiftKey) {
                      e.preventDefault();
                      toggleSelection(user.id, index, true);
                    }
                  }}
                  aria-label={`${user.name} ausw\u00e4hlen`}
                />
              </TableCell>

              {visibleColumns.map((key) => (
                <TableCell key={key} className={colClass(key)}>
                  {renderCell(key, user, isSelf, slug)}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ============================================================================
// Cell Renderers
// ============================================================================

function renderCell(key: UserColumnKey, user: ClubUserListItem, isSelf: boolean, slug: string) {
  switch (key) {
    case 'name': {
      const avatarUrl = user.userId ? `/api/clubs/${slug}/users/${user.userId}/avatar` : undefined;
      return (
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={user.name} />}
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{user.name}</span>
              {isSelf && <span className="text-xs text-muted-foreground shrink-0">(Du)</span>}
              {user.isExternal && (
                <Badge variant="outline" className="text-xs shrink-0">
                  Extern
                </Badge>
              )}
            </div>
            {/* Show status on mobile since status column is hidden */}
            <div className="md:hidden mt-0.5">
              <UserStatusBadge status={user.status} />
            </div>
          </div>
        </div>
      );
    }
    case 'email':
      return <span className="truncate block max-w-48">{user.email}</span>;
    case 'roles':
      return <UserRoleBadges roles={user.roles} />;
    case 'status':
      return <UserStatusBadge status={user.status} />;
    case 'joinedAt':
      return formatDate(user.joinedAt);
    default:
      return null;
  }
}

/**
 * Extract initials from a name (first letter of first and last word).
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Format an ISO date string to German DD.MM.YYYY format.
 */
function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('T')[0].split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}.${month}.${year}`;
}
