'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, UserPlus, Link2, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUnlinkedUsers, useToggleExternal } from '@/hooks/use-members';
import { useToast } from '@/hooks/use-toast';
import { MemberPickerDialog } from './member-picker-dialog';

// ============================================================================
// Types
// ============================================================================

export interface PrefillData {
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  displayName?: string;
}

interface UnlinkedUsersGroupProps {
  slug: string;
  onCreateMember: (prefillData: PrefillData) => void;
}

// ============================================================================
// Role Labels
// ============================================================================

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Inhaber',
  ADMIN: 'Admin',
  TREASURER: 'Kassenwart',
  SECRETARY: 'Schriftführer',
  MEMBER: 'Mitglied',
};

// ============================================================================
// Component
// ============================================================================

export function UnlinkedUsersGroup({ slug, onCreateMember }: UnlinkedUsersGroupProps) {
  const { toast } = useToast();
  const { data: unlinkedUsers, isLoading } = useUnlinkedUsers(slug);
  const toggleExternal = useToggleExternal(slug);

  const [isExpanded, setIsExpanded] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerUserId, setPickerUserId] = useState('');
  const [pickerUserName, setPickerUserName] = useState('');
  const [pickerUserEmail, setPickerUserEmail] = useState('');

  // Split into active and external users
  const activeUsers = useMemo(
    () => (unlinkedUsers ?? []).filter((u) => !u.isExternal),
    [unlinkedUsers]
  );

  const externalUsers = useMemo(
    () => (unlinkedUsers ?? []).filter((u) => u.isExternal),
    [unlinkedUsers]
  );

  // Don't render if loading or no unlinked users
  if (isLoading || !unlinkedUsers || unlinkedUsers.length === 0) {
    return null;
  }

  const handleToggleExternal = async (clubUserId: string, isExternal: boolean) => {
    try {
      await toggleExternal.mutateAsync({ clubUserId, isExternal });
      toast({
        title: isExternal ? 'Benutzer als extern markiert' : 'Markierung aufgehoben',
      });
    } catch (err) {
      toast({
        title: 'Fehler',
        description: err instanceof Error ? err.message : 'Aktualisierung fehlgeschlagen',
        variant: 'destructive',
      });
    }
  };

  const handleCreateMember = (user: (typeof activeUsers)[0]) => {
    // Try to split name into first/last
    const nameParts = (user.name ?? '').trim().split(/\s+/);
    const firstName =
      nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : (nameParts[0] ?? '');
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

    onCreateMember({
      userId: user.userId,
      firstName,
      lastName,
      email: user.email,
      displayName: user.name,
    });
  };

  const handleLinkUser = (user: (typeof activeUsers)[0]) => {
    setPickerUserId(user.userId);
    setPickerUserName(user.name);
    setPickerUserEmail(user.email);
    setPickerOpen(true);
  };

  // Collapsed view
  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <ChevronRight className="h-4 w-4 shrink-0" />
        <span>
          {activeUsers.length} Benutzer ohne Mitgliedsprofil
          {externalUsers.length > 0 && (
            <span className="ml-1 text-xs">({externalUsers.length} extern)</span>
          )}
        </span>
      </button>
    );
  }

  // Expanded view
  return (
    <>
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Benutzer ohne Mitgliedsprofil</h3>
            <Badge variant="secondary" className="text-xs">
              {activeUsers.length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setIsExpanded(false)}
          >
            <ChevronDown className="mr-1 h-3.5 w-3.5" />
            Einklappen
          </Button>
        </div>

        {/* Active users */}
        {activeUsers.length > 0 && (
          <div className="space-y-2">
            {activeUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 rounded-md bg-background/60 p-2.5"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  {user.image && <AvatarImage src={user.image} />}
                  <AvatarFallback className="text-xs">
                    {(user.name ?? '?').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>

                {/* Role badges */}
                <div className="hidden sm:flex items-center gap-1 shrink-0">
                  {user.roles.map((role) => (
                    <Badge key={role} variant="outline" className="text-xs px-1.5 py-0">
                      {ROLE_LABELS[role] ?? role}
                    </Badge>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleCreateMember(user)}
                  >
                    <UserPlus className="mr-1 h-3 w-3" />
                    <span className="hidden sm:inline">Mitglied anlegen</span>
                    <span className="sm:hidden">Anlegen</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleLinkUser(user)}
                  >
                    <Link2 className="mr-1 h-3 w-3" />
                    <span className="hidden sm:inline">Verknüpfen</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleToggleExternal(user.id, true)}
                    disabled={toggleExternal.isPending}
                  >
                    <ExternalLink className="mr-1 h-3 w-3" />
                    <span className="hidden lg:inline">Als extern markieren</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* External users subsection */}
        {externalUsers.length > 0 && (
          <>
            {activeUsers.length > 0 && (
              <div className="border-t border-border/50 pt-3">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <UserX className="h-3.5 w-3.5" />
                  Externe Benutzer ({externalUsers.length})
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              {externalUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 rounded-md p-2 opacity-60 hover:opacity-80 transition-opacity"
                >
                  <Avatar className="h-7 w-7 shrink-0">
                    {user.image && <AvatarImage src={user.image} />}
                    <AvatarFallback className="text-xs">
                      {(user.name ?? '?').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleToggleExternal(user.id, false)}
                    disabled={toggleExternal.isPending}
                  >
                    Markierung aufheben
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Member Picker Dialog */}
      <MemberPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        slug={slug}
        userId={pickerUserId}
        userName={pickerUserName}
        userEmail={pickerUserEmail}
      />
    </>
  );
}
