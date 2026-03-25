'use client';

import { useState } from 'react';
import { UserMinus, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useRemoveClubUser, useUpdateClubUserRoles } from '@/hooks/use-club-users';
import { useToast } from '@/hooks/use-toast';
import type { ClubUserListItem } from '@/hooks/use-club-users';

// ============================================================================
// Constants
// ============================================================================

const BULK_ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'TREASURER', label: 'Kassierer' },
  { value: 'SECRETARY', label: 'Schriftführer' },
  { value: 'MEMBER', label: 'Mitglied' },
] as const;

// ============================================================================
// Types
// ============================================================================

interface UserBulkActionsProps {
  selectedIds: Set<string>;
  users: ClubUserListItem[];
  currentUserId: string;
  clubSlug: string;
  onClearSelection: () => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Floating action bar displayed at the bottom of the viewport when 1+ users are selected.
 * Provides bulk remove and bulk role change actions.
 * Self-protection: filters out the current user from destructive actions.
 */
export function UserBulkActions({
  selectedIds,
  users,
  currentUserId,
  clubSlug,
  onClearSelection,
}: UserBulkActionsProps) {
  const { toast } = useToast();
  const removeUser = useRemoveClubUser(clubSlug);
  const updateRoles = useUpdateClubUserRoles(clubSlug);

  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [roleConfirm, setRoleConfirm] = useState<{
    action: 'add' | 'remove';
    role: string;
    label: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (selectedIds.size === 0) return null;

  const selectedUsers = users.filter((u) => selectedIds.has(u.id));
  // Self-protection: exclude current user from destructive bulk ops
  const actionableUsers = selectedUsers.filter((u) => u.userId !== currentUserId);

  // --- Bulk Remove ---

  const handleBulkRemove = async () => {
    if (actionableUsers.length === 0) {
      toast({
        title: 'Keine Benutzer zum Entfernen',
        description: 'Du kannst dich nicht selbst entfernen.',
        variant: 'destructive',
      });
      setRemoveDialogOpen(false);
      return;
    }

    setIsProcessing(true);
    const results = await Promise.allSettled(
      actionableUsers.map((u) => removeUser.mutateAsync(u.id))
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    if (failed === 0) {
      toast({ title: `${succeeded} Benutzer entfernt` });
    } else {
      toast({
        title: `${succeeded} entfernt, ${failed} fehlgeschlagen`,
        variant: 'destructive',
      });
    }

    setIsProcessing(false);
    setRemoveDialogOpen(false);
    onClearSelection();
  };

  // --- Bulk Role Change ---

  const handleBulkRoleChange = async () => {
    if (!roleConfirm || actionableUsers.length === 0) {
      setRoleConfirm(null);
      return;
    }

    setIsProcessing(true);
    const { action, role } = roleConfirm;

    const results = await Promise.allSettled(
      actionableUsers.map((u) => {
        const newRoles =
          action === 'add' ? [...new Set([...u.roles, role])] : u.roles.filter((r) => r !== role);

        // Ensure at least one role remains
        if (newRoles.length === 0) return Promise.reject(new Error('Mindestens eine Rolle'));

        return updateRoles.mutateAsync({ clubUserId: u.id, roles: newRoles });
      })
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    if (failed === 0) {
      toast({ title: `Rollen für ${succeeded} Benutzer aktualisiert` });
    } else {
      toast({
        title: `${succeeded} aktualisiert, ${failed} fehlgeschlagen`,
        variant: 'destructive',
      });
    }

    setIsProcessing(false);
    setRoleConfirm(null);
    onClearSelection();
  };

  const selfExcluded = selectedUsers.length - actionableUsers.length;

  return (
    <>
      {/* Floating bar */}
      <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 flex items-center gap-3 rounded-lg border bg-background/95 px-4 py-2.5 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Selection count */}
        <span className="text-sm font-medium whitespace-nowrap">
          {selectedIds.size} von {users.length} ausgewählt
        </span>

        {/* Divider */}
        <div className="h-5 w-px bg-border" />

        {/* Bulk Remove */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRemoveDialogOpen(true)}
          disabled={isProcessing}
        >
          <UserMinus className="mr-1 size-3.5" />
          Entfernen
        </Button>

        {/* Bulk Role Change */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isProcessing}>
              Rolle ändern
              <ChevronDown className="ml-1 size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Rolle hinzufügen</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {BULK_ROLES.map((role) => (
                  <DropdownMenuItem
                    key={role.value}
                    onSelect={() =>
                      setRoleConfirm({ action: 'add', role: role.value, label: role.label })
                    }
                  >
                    {role.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Rolle entfernen</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {BULK_ROLES.map((role) => (
                  <DropdownMenuItem
                    key={role.value}
                    onSelect={() =>
                      setRoleConfirm({ action: 'remove', role: role.value, label: role.label })
                    }
                  >
                    {role.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear selection */}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClearSelection}>
          <X className="size-3.5" />
          <span className="sr-only">Auswahl aufheben</span>
        </Button>
      </div>

      {/* Remove confirmation dialog */}
      <ConfirmDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        title="Benutzer entfernen"
        description={
          selfExcluded > 0
            ? `Möchtest du ${actionableUsers.length} Benutzer wirklich aus dem Verein entfernen? (Du selbst wirst übersprungen.)`
            : `Möchtest du ${actionableUsers.length} Benutzer wirklich aus dem Verein entfernen?`
        }
        confirmLabel="Entfernen"
        variant="destructive"
        onConfirm={handleBulkRemove}
        loading={isProcessing}
      />

      {/* Role change confirmation dialog */}
      <ConfirmDialog
        open={!!roleConfirm}
        onOpenChange={(open) => !open && setRoleConfirm(null)}
        title="Rolle ändern"
        description={
          roleConfirm
            ? roleConfirm.action === 'add'
              ? `Rolle "${roleConfirm.label}" für ${actionableUsers.length} Benutzer hinzufügen?`
              : `Rolle "${roleConfirm.label}" für ${actionableUsers.length} Benutzer entfernen?`
            : ''
        }
        confirmLabel="Ändern"
        variant="default"
        onConfirm={handleBulkRoleChange}
        loading={isProcessing}
      />
    </>
  );
}
