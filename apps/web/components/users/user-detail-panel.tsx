'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, ExternalLink, Info, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import {
  useClubUserDetail,
  useUpdateClubUserRoles,
  useUpdateClubUserStatus,
  useRemoveClubUser,
} from '@/hooks/use-club-users';
import { useToast } from '@/hooks/use-toast';
import { useHasPermission } from '@/lib/permission-hooks';
import { apiFetch } from '@/lib/api';
import { UserDetailHeader } from './user-detail-header';

// ============================================================================
// Types
// ============================================================================

interface UserDetailPanelProps {
  selectedUserId: string | null;
  currentUserId: string;
  currentUserRoles: string[];
  clubSlug: string;
  onClose: () => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

// ============================================================================
// Role Configuration (reused from role-edit-dialog pattern)
// ============================================================================

const ROLE_CONFIG = [
  {
    value: 'OWNER',
    label: 'Verantwortlicher',
    description: 'Kann Vereinsdaten löschen und Verantwortliche ernennen',
    ownerOnly: true,
  },
  {
    value: 'ADMIN',
    label: 'Admin',
    description: 'Kann Benutzer verwalten und Einstellungen ändern',
    ownerOnly: false,
  },
  {
    value: 'TREASURER',
    label: 'Kassierer',
    description: 'Kann Finanzen und Mitglieder verwalten',
    ownerOnly: false,
  },
  {
    value: 'SECRETARY',
    label: 'Schriftführer',
    description: 'Kann Kontaktdaten bearbeiten und Daten exportieren',
    ownerOnly: false,
  },
  {
    value: 'MEMBER',
    label: 'Mitglied',
    description: 'Kann eigenes Profil sehen und bearbeiten',
    ownerOnly: false,
  },
] as const;

// ============================================================================
// Detail Content
// ============================================================================

interface DetailContentProps {
  clubUserId: string;
  currentUserId: string;
  currentUserRoles: string[];
  clubSlug: string;
  onClose: () => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

function DetailContent({
  clubUserId,
  currentUserId,
  currentUserRoles,
  clubSlug,
  onClose,
  onNavigatePrev,
  onNavigateNext,
  hasPrev,
  hasNext,
}: DetailContentProps) {
  const { toast } = useToast();
  const { data: detail, isLoading, isError, refetch } = useClubUserDetail(clubSlug, clubUserId);
  const updateRoles = useUpdateClubUserRoles(clubSlug);
  const updateStatus = useUpdateClubUserStatus(clubSlug);
  const removeUser = useRemoveClubUser(clubSlug);

  const canReadMembers = useHasPermission('member:read');
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [togglingExternal, setTogglingExternal] = useState(false);

  const isSelf = detail?.userId === currentUserId;
  const isCurrentUserOwner = currentUserRoles.includes('OWNER');

  // ---- Role toggling ----

  const handleRoleToggle = useCallback(
    async (roleValue: string, checked: boolean) => {
      if (!detail) return;
      const newRoles = checked
        ? [...detail.roles, roleValue]
        : detail.roles.filter((r) => r !== roleValue);

      if (newRoles.length === 0) {
        toast({
          title: 'Mindestens eine Rolle erforderlich',
          description: 'Ein Benutzer muss mindestens eine Rolle haben.',
          variant: 'destructive',
        });
        return;
      }

      setUpdatingRole(roleValue);
      try {
        await updateRoles.mutateAsync({ clubUserId: detail.id, roles: newRoles });
        toast({ title: 'Rollen aktualisiert' });
        await refetch();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Fehler beim Ändern der Rollen';
        toast({ title: 'Fehler', description: message, variant: 'destructive' });
      } finally {
        setUpdatingRole(null);
      }
    },
    [detail, updateRoles, toast, refetch]
  );

  const isRoleDisabled = (roleValue: string, ownerOnly: boolean) => {
    if (ownerOnly && !isCurrentUserOwner) return true;
    if (isSelf && roleValue === 'OWNER' && !detail?.roles.includes('OWNER')) return true;
    return false;
  };

  // ---- Status actions ----

  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      if (!detail) return;
      try {
        await updateStatus.mutateAsync({ clubUserId: detail.id, status: newStatus });
        toast({
          title: newStatus === 'ACTIVE' ? 'Zugang reaktiviert' : 'Zugang gesperrt',
        });
        await refetch();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Fehler beim Ändern des Status';
        toast({ title: 'Fehler', description: message, variant: 'destructive' });
      }
    },
    [detail, updateStatus, toast, refetch]
  );

  const handleRemove = useCallback(async () => {
    if (!detail) return;
    try {
      await removeUser.mutateAsync(detail.id);
      toast({ title: 'Benutzer entfernt' });
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Fehler beim Entfernen';
      toast({ title: 'Fehler', description: message, variant: 'destructive' });
    }
  }, [detail, removeUser, toast, onClose]);

  // ---- External toggle ----

  const handleToggleExternal = useCallback(
    async (isExternal: boolean) => {
      if (!detail) return;
      setTogglingExternal(true);
      try {
        const res = await apiFetch(`/api/clubs/${clubSlug}/users/${detail.id}/external`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isExternal }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Fehler');
        }
        toast({ title: isExternal ? 'Als extern markiert' : 'Extern-Markierung entfernt' });
        await refetch();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Fehler';
        toast({ title: 'Fehler', description: message, variant: 'destructive' });
      } finally {
        setTogglingExternal(false);
      }
    },
    [detail, clubSlug, toast, refetch]
  );

  // ---- Loading / Error ----

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (isError || !detail) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground p-6">
        <p className="text-sm">Benutzer nicht gefunden</p>
        <Button variant="outline" size="sm" onClick={onClose}>
          Schließen
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar: prev/next navigation + close */}
      <div className="flex items-center justify-between p-2 px-4 border-b">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={!hasPrev}
            onClick={onNavigatePrev}
          >
            <ChevronUp className="h-4 w-4" />
            <span className="sr-only">Vorheriger Benutzer</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={!hasNext}
            onClick={onNavigateNext}
          >
            <ChevronDown className="h-4 w-4" />
            <span className="sr-only">Nächster Benutzer</span>
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
          <span className="sr-only">Schließen</span>
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b">
          <UserDetailHeader
            name={detail.name}
            email={detail.email}
            image={detail.image}
            status={detail.status}
            isSelf={isSelf}
          />
        </div>

        {/* Profile Section (read-only) */}
        <div className="p-4 space-y-3 border-b">
          <h3 className="text-sm font-semibold">Profil</h3>
          <div className="space-y-2">
            <div>
              <span className="text-xs text-muted-foreground">Name</span>
              <p className="text-sm">{detail.name}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">E-Mail</span>
              <p className="text-sm">{detail.email}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Profilinformationen werden vom Benutzer selbst verwaltet.
          </p>
        </div>

        {/* Roles Section (inline editing) */}
        <div className="p-4 space-y-3 border-b">
          <h3 className="text-sm font-semibold">Rollen</h3>
          <div className="space-y-3">
            {ROLE_CONFIG.map((role) => {
              const disabled = isRoleDisabled(role.value, role.ownerOnly);
              const isUpdating = updatingRole === role.value;

              return (
                <div key={role.value} className="flex items-start space-x-3">
                  {isUpdating ? (
                    <div className="flex h-4 w-4 items-center justify-center mt-0.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Checkbox
                      id={`role-${role.value}`}
                      checked={detail.roles.includes(role.value)}
                      onCheckedChange={(checked) => handleRoleToggle(role.value, checked === true)}
                      disabled={disabled || updatingRole !== null}
                      className="mt-0.5"
                    />
                  )}
                  <div className="space-y-0.5">
                    <Label
                      htmlFor={`role-${role.value}`}
                      className={disabled ? 'text-muted-foreground' : ''}
                    >
                      {role.label}
                      {role.ownerOnly && !isCurrentUserOwner && (
                        <span className="text-xs text-muted-foreground ml-1">
                          (nur für Verantwortliche)
                        </span>
                      )}
                    </Label>
                    <p className="text-xs text-muted-foreground">{role.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Member-Link Section — only visible to users with member:read permission */}
        {canReadMembers && (
          <div className="p-4 space-y-3 border-b">
            <h3 className="text-sm font-semibold">Mitgliedsverknüpfung</h3>

            {detail.member ? (
              <div className="flex items-center gap-2">
                <span className="text-sm">Verknüpftes Mitglied:</span>
                <Link
                  href={`/clubs/${clubSlug}/members?member=${detail.member.id}`}
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  {detail.member.firstName} {detail.member.lastName} ({detail.member.memberNumber})
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            ) : detail.isExternal ? (
              <div className="space-y-2">
                <Badge variant="outline">Als extern markiert</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleExternal(false)}
                  disabled={togglingExternal}
                >
                  {togglingExternal && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                  Extern-Markierung entfernen
                </Button>
              </div>
            ) : (
              <div className="rounded-md border p-3 space-y-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Dieser Benutzer ist mit keinem Mitglied verknüpft.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/clubs/${clubSlug}/members`}>Mitglied verknüpfen</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/clubs/${clubSlug}/members?create=true`}>Mitglied erstellen</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleExternal(true)}
                    disabled={togglingExternal}
                  >
                    {togglingExternal && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                    Als extern markieren
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions Section */}
        {!isSelf && (
          <div className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">Aktionen</h3>
            <Separator />
            <div className="flex flex-col gap-2">
              {detail.status === 'ACTIVE' && (
                <Button
                  variant="outline"
                  className="text-destructive justify-start"
                  onClick={() => handleStatusChange('SUSPENDED')}
                  disabled={updateStatus.isPending}
                >
                  {updateStatus.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Zugang sperren
                </Button>
              )}

              {detail.status === 'SUSPENDED' && (
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => handleStatusChange('ACTIVE')}
                  disabled={updateStatus.isPending}
                >
                  {updateStatus.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Zugang reaktivieren
                </Button>
              )}

              {detail.status === 'PENDING' ? (
                <Button
                  variant="outline"
                  className="text-destructive justify-start"
                  onClick={() => setRemoveDialogOpen(true)}
                  disabled={removeUser.isPending}
                >
                  Einladung widerrufen
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  className="justify-start"
                  onClick={() => setRemoveDialogOpen(true)}
                  disabled={removeUser.isPending}
                >
                  Aus Verein entfernen
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Remove Confirmation Dialog (CONV-010) */}
      <ConfirmDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        title={detail.status === 'PENDING' ? 'Einladung widerrufen' : 'Benutzer entfernen'}
        description={
          detail.status === 'PENDING'
            ? `Möchtest du die Einladung für ${detail.name} wirklich widerrufen?`
            : `Möchtest du ${detail.name} wirklich aus dem Verein entfernen?`
        }
        confirmLabel={detail.status === 'PENDING' ? 'Widerrufen' : 'Entfernen'}
        variant="destructive"
        onConfirm={handleRemove}
        loading={removeUser.isPending}
      />
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
        <div className="flex items-center gap-1">
          <Skeleton className="h-7 w-7 rounded" />
          <Skeleton className="h-7 w-7 rounded" />
        </div>
        <Skeleton className="h-7 w-7 rounded" />
      </div>
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
      <Skeleton className="h-px w-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-px w-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * User detail Sheet that slides in from the right.
 * Shows profile (read-only), inline role editing, member linkage,
 * and status management actions.
 */
export function UserDetailPanel({
  selectedUserId,
  currentUserId,
  currentUserRoles,
  clubSlug,
  onClose,
  onNavigatePrev,
  onNavigateNext,
  hasPrev,
  hasNext,
}: UserDetailPanelProps) {
  return (
    <Sheet open={!!selectedUserId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0" showCloseButton={false}>
        <SheetHeader className="sr-only">
          <SheetTitle>Benutzer Details</SheetTitle>
        </SheetHeader>
        {selectedUserId && (
          <DetailContent
            clubUserId={selectedUserId}
            currentUserId={currentUserId}
            currentUserRoles={currentUserRoles}
            clubSlug={clubSlug}
            onClose={onClose}
            onNavigatePrev={onNavigatePrev}
            onNavigateNext={onNavigateNext}
            hasPrev={hasPrev}
            hasNext={hasNext}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
