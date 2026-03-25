'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, UserPlus } from 'lucide-react';
import { useSession } from '@/lib/auth-client';
import { useHasPermission } from '@/lib/permission-hooks';
import { useClubPermissions } from '@/lib/club-permissions';
import { AccessDenied } from '@/components/access-denied';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/page-header';
import { DataTableSearch } from '@/components/shared/data-table-search';
import { MultiSelectFilter } from '@/components/shared/multi-select-filter';
import { ColumnPicker } from '@/components/shared/column-picker';
import {
  UserListTable,
  type UserSortState,
  type UserColumnKey,
} from '@/components/users/user-list-table';
import { UserDetailPanel } from '@/components/users/user-detail-panel';
import { UserFilterChips } from '@/components/users/user-filter-chips';
import { UserInviteDialog } from '@/components/users/user-invite-dialog';
import { UserBulkActions } from '@/components/users/user-bulk-actions';
import { useClubUsers } from '@/hooks/use-club-users';
import { useUserFilters } from '@/hooks/use-user-filters';
import { useDebounce } from '@/hooks/use-debounce';
import { useColumnVisibility, type ColumnVisibilityConfig } from '@/hooks/use-column-visibility';

// ============================================================================
// Column Config
// ============================================================================

const USER_COLUMN_CONFIG: ColumnVisibilityConfig<UserColumnKey> = {
  storagePrefix: 'user-columns',
  defaultColumns: { name: true, email: true, roles: true, status: true, joinedAt: true },
  defaultOrder: ['name', 'email', 'roles', 'status', 'joinedAt'] as UserColumnKey[],
  storageVersion: 1,
};

const COLUMN_LABELS: Record<UserColumnKey, string> = {
  name: 'Name',
  email: 'E-Mail',
  roles: 'Rollen',
  status: 'Status',
  joinedAt: 'Beitrittsdatum',
};

// ============================================================================
// Filter Options
// ============================================================================

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Aktiv' },
  { value: 'PENDING', label: 'Eingeladen' },
  { value: 'SUSPENDED', label: 'Gesperrt' },
];

const ROLE_OPTIONS = [
  { value: 'OWNER', label: 'Verantwortlicher' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'TREASURER', label: 'Kassierer' },
  { value: 'SECRETARY', label: 'Schriftführer' },
  { value: 'MEMBER', label: 'Mitglied' },
];

// ============================================================================
// Component
// ============================================================================

export function UsersSettingsClient() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { data: session } = useSession();
  const { roles: currentUserRoles } = useClubPermissions();
  const hasPermission = useHasPermission('users:read');

  // --- Filter state (URL-synced via nuqs) ---
  const [filters, setFilters] = useUserFilters();

  // Local search input with debounce
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Sync debounced search to nuqs URL state
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      setFilters({ search: debouncedSearch });
    }
  }, [debouncedSearch, filters.search, setFilters]);

  // Sync nuqs search back to local input when URL changes externally
  const filtersSearch = filters.search;
  useEffect(() => {
    setSearchInput((prev) => (prev !== filtersSearch ? filtersSearch : prev));
  }, [filtersSearch]);

  // --- Data fetching ---
  const {
    data: users = [],
    isLoading,
    isError,
    refetch,
  } = useClubUsers(slug, {
    search: debouncedSearch || undefined,
    status: filters.status.length > 0 ? filters.status : undefined,
    roles: filters.roles.length > 0 ? filters.roles : undefined,
  });

  // --- Column visibility ---
  const {
    columns: columnVisibility,
    order: columnOrder,
    toggleColumn,
    reorderColumns,
    resetColumns,
    isDefault: isColumnsDefault,
  } = useColumnVisibility(slug, USER_COLUMN_CONFIG);

  // --- UI state ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<UserSortState>({ key: 'name', direction: 'asc' });
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Reset selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [debouncedSearch, filters.status, filters.roles]);

  // --- Sorting (client-side) ---
  const sortedUsers = useMemo(() => {
    const sorted = [...users];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sort.key) {
        case 'name':
          cmp = a.name.localeCompare(b.name, 'de');
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status, 'de');
          break;
        case 'roles':
          cmp = a.roles.join(',').localeCompare(b.roles.join(','), 'de');
          break;
        case 'joinedAt':
          cmp = a.joinedAt.localeCompare(b.joinedAt);
          break;
      }
      return sort.direction === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [users, sort]);

  // --- Pending count ---
  const pendingCount = useMemo(() => users.filter((u) => u.status === 'PENDING').length, [users]);

  // --- Detail panel navigation (via nuqs user param) ---
  const selectedUserId = filters.user || null;

  const selectUser = useCallback(
    (id: string) => {
      setFilters({ user: id });
    },
    [setFilters]
  );

  const closePanel = useCallback(() => {
    setFilters({ user: '' });
  }, [setFilters]);

  const currentUserIndex = useMemo(
    () => (selectedUserId ? sortedUsers.findIndex((u) => u.id === selectedUserId) : -1),
    [selectedUserId, sortedUsers]
  );

  const navigatePrev = useCallback(() => {
    if (currentUserIndex > 0) selectUser(sortedUsers[currentUserIndex - 1].id);
  }, [currentUserIndex, sortedUsers, selectUser]);

  const navigateNext = useCallback(() => {
    if (currentUserIndex >= 0 && currentUserIndex < sortedUsers.length - 1)
      selectUser(sortedUsers[currentUserIndex + 1].id);
  }, [currentUserIndex, sortedUsers, selectUser]);

  const hasPrev = currentUserIndex > 0;
  const hasNext = currentUserIndex >= 0 && currentUserIndex < sortedUsers.length - 1;

  // --- Access denied ---
  if (!hasPermission) {
    return (
      <AccessDenied
        feature="die Benutzerverwaltung"
        backHref={`/clubs/${slug}/dashboard`}
        backLabel="Zurück zum Verein"
      />
    );
  }

  // --- Loading state ---
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // --- Error state ---
  if (isError) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">Fehler beim Laden der Benutzer</p>
        <Button onClick={() => refetch()} variant="outline" className="mt-4">
          Erneut versuchen
        </Button>
      </div>
    );
  }

  const countDescription = `${users.length} Benutzer haben Zugang zu diesem Verein`;

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        title="Benutzer"
        description={countDescription}
        actions={
          <Button onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Benutzer einladen
          </Button>
        }
      />

      <div className="container mx-auto space-y-4 px-4 pb-6">
        {/* Pending invitations badge */}
        {pendingCount > 0 && (
          <div>
            <Badge variant="secondary" className="font-normal">
              {pendingCount} offene {pendingCount === 1 ? 'Einladung' : 'Einladungen'}
            </Badge>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <DataTableSearch
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Name oder E-Mail suchen..."
            className="flex-1"
          />
          <MultiSelectFilter
            label="Status"
            options={STATUS_OPTIONS}
            selected={filters.status}
            onSelectionChange={(status) => setFilters({ status: status as typeof filters.status })}
          />
          <MultiSelectFilter
            label="Rolle"
            options={ROLE_OPTIONS}
            selected={filters.roles}
            onSelectionChange={(roles) => setFilters({ roles: roles as typeof filters.roles })}
          />
          <ColumnPicker
            columns={columnVisibility}
            order={columnOrder}
            labels={COLUMN_LABELS}
            onToggle={toggleColumn}
            onReorder={reorderColumns}
            onReset={resetColumns}
            isDefault={isColumnsDefault}
          />
        </div>

        {/* Filter Chips */}
        <UserFilterChips filters={filters} setFilters={setFilters} />

        {/* Table */}
        <UserListTable
          users={sortedUsers}
          isLoading={false}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onSelectUser={selectUser}
          sort={sort}
          onSortChange={setSort}
          columnVisibility={columnVisibility}
          currentUserId={session?.user?.id}
          slug={slug}
        />

        {/* Bulk Actions */}
        <UserBulkActions
          selectedIds={selectedIds}
          users={sortedUsers}
          currentUserId={session?.user?.id ?? ''}
          clubSlug={slug}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      </div>

      {/* Overlays */}
      <UserDetailPanel
        selectedUserId={selectedUserId}
        currentUserId={session?.user?.id ?? ''}
        currentUserRoles={currentUserRoles}
        clubSlug={slug}
        onClose={closePanel}
        onNavigatePrev={navigatePrev}
        onNavigateNext={navigateNext}
        hasPrev={hasPrev}
        hasNext={hasNext}
      />
      <UserInviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        clubSlug={slug}
        currentUserRoles={currentUserRoles}
      />
    </div>
  );
}
