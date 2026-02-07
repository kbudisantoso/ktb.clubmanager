'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface ClubUser {
  id: string;
  userId: string;
  name: string;
  email: string;
  roles: string[];
}

interface RoleEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: ClubUser | null;
  currentUserRoles: string[];
  isSelfEdit?: boolean;
  onSave: (userId: string, roles: string[]) => Promise<void>;
}

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

export function RoleEditDialog({
  open,
  onOpenChange,
  user,
  currentUserRoles,
  isSelfEdit = false,
  onSave,
}: RoleEditDialogProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const isCurrentUserOwner = currentUserRoles.includes('OWNER');
  const userHasOwnerRole = user?.roles.includes('OWNER') ?? false;

  useEffect(() => {
    if (user) {
      setSelectedRoles([...user.roles]);
    }
  }, [user]);

  const handleRoleToggle = (role: string, checked: boolean) => {
    setSelectedRoles((prev) => (checked ? [...prev, role] : prev.filter((r) => r !== role)));
  };

  const handleSave = async () => {
    if (!user || selectedRoles.length === 0) return;

    setSaving(true);
    try {
      await onSave(user.id, selectedRoles);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const isRoleDisabled = (roleValue: string, ownerOnly: boolean) => {
    // Standard: OWNER role requires OWNER to assign
    if (ownerOnly && !isCurrentUserOwner) return true;
    // Self-edit: Cannot add OWNER role to self (privilege escalation)
    if (isSelfEdit && roleValue === 'OWNER' && !userHasOwnerRole) return true;
    return false;
  };

  const getRoleDisabledReason = (roleValue: string, ownerOnly: boolean) => {
    if (ownerOnly && !isCurrentUserOwner) return ' (nur für Verantwortliche)';
    if (isSelfEdit && roleValue === 'OWNER' && !userHasOwnerRole) {
      return ' (kann nicht selbst zugewiesen werden)';
    }
    return '';
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isSelfEdit ? 'Eigene Rollen bearbeiten' : 'Rollen bearbeiten'}</DialogTitle>
          <DialogDescription>
            {isSelfEdit
              ? 'Verwalte deine eigenen Rollen im Verein'
              : `Rollen für ${user.name} verwalten`}
          </DialogDescription>
        </DialogHeader>

        {isSelfEdit && (
          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            Du musst mindestens eine Rolle behalten.
            {userHasOwnerRole &&
              ' Um diese Rolle abzugeben, muss ein anderer Verantwortlicher existieren.'}
          </p>
        )}

        <div className="space-y-4 py-4">
          {ROLE_CONFIG.map((role) => {
            const disabled = isRoleDisabled(role.value, role.ownerOnly);
            const disabledReason = getRoleDisabledReason(role.value, role.ownerOnly);

            return (
              <div key={role.value} className="flex items-start space-x-3">
                <Checkbox
                  id={role.value}
                  checked={selectedRoles.includes(role.value)}
                  onCheckedChange={(checked) => handleRoleToggle(role.value, checked === true)}
                  disabled={disabled}
                />
                <div className="space-y-1">
                  <Label htmlFor={role.value} className={disabled ? 'text-muted-foreground' : ''}>
                    {role.label}
                    {disabledReason}
                  </Label>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={saving || selectedRoles.length === 0}>
            {saving ? 'Speichern...' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
