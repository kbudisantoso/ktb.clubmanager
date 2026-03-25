'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInviteClubUser } from '@/hooks/use-club-users';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// Role Configuration
// ============================================================================

const INVITE_ROLES = [
  { value: 'OWNER', label: 'Verantwortlicher', ownerOnly: true },
  { value: 'ADMIN', label: 'Admin', ownerOnly: false },
  { value: 'TREASURER', label: 'Kassierer', ownerOnly: false },
  { value: 'SECRETARY', label: 'Schriftführer', ownerOnly: false },
  { value: 'MEMBER', label: 'Mitglied', ownerOnly: false },
] as const;

// ============================================================================
// Types
// ============================================================================

interface UserInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubSlug: string;
  currentUserRoles: string[];
}

// ============================================================================
// Component
// ============================================================================

/**
 * Dialog for inviting a registered user to a club by email.
 * Allows selection of roles, with MEMBER pre-selected by default.
 */
export function UserInviteDialog({
  open,
  onOpenChange,
  clubSlug,
  currentUserRoles,
}: UserInviteDialogProps) {
  const { toast } = useToast();
  const invite = useInviteClubUser(clubSlug);

  const [email, setEmail] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set(['MEMBER']));

  const isCurrentUserOwner = currentUserRoles.includes('OWNER');

  const resetForm = () => {
    setEmail('');
    setSelectedRoles(new Set(['MEMBER']));
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) {
        next.delete(role);
      } else {
        next.add(role);
      }
      return next;
    });
  };

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const hasRoles = selectedRoles.size > 0;
  const canSubmit = isEmailValid && hasRoles && !invite.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      await invite.mutateAsync({
        email: email.trim(),
        roles: Array.from(selectedRoles),
      });
      toast({
        title: 'Einladung gesendet',
        description: `${email.trim()} wurde eingeladen.`,
      });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Fehler beim Einladen des Benutzers';
      toast({ title: 'Fehler', description: message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Benutzer einladen</DialogTitle>
            <DialogDescription>
              Lade einen registrierten Benutzer in deinen Verein ein.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Email input */}
            <div className="space-y-2">
              <Label htmlFor="invite-email">E-Mail-Adresse</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>

            {/* Role selection */}
            <div className="space-y-2">
              <Label>Rollen</Label>
              <div className="space-y-3">
                {INVITE_ROLES.map((role) => {
                  const hidden = role.ownerOnly && !isCurrentUserOwner;
                  if (hidden) return null;

                  return (
                    <div key={role.value} className="flex items-center space-x-3">
                      <Checkbox
                        id={`invite-role-${role.value}`}
                        checked={selectedRoles.has(role.value)}
                        onCheckedChange={() => toggleRole(role.value)}
                      />
                      <Label htmlFor={`invite-role-${role.value}`} className="font-normal">
                        {role.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
              {!hasRoles && (
                <p className="text-xs text-destructive">Mindestens eine Rolle erforderlich</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {invite.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Einladen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
