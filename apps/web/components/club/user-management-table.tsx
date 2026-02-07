'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal } from 'lucide-react';
import { RoleEditDialog } from './role-edit-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';

interface ClubUser {
  id: string;
  userId: string;
  name: string;
  email: string;
  image?: string;
  roles: string[];
  joinedAt: string;
}

interface UserManagementTableProps {
  users: ClubUser[];
  currentUserId: string;
  currentUserRoles: string[];
  clubSlug: string;
  onRefresh: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Verantwortlicher',
  ADMIN: 'Admin',
  TREASURER: 'Kassierer',
  SECRETARY: 'Schriftführer',
  MEMBER: 'Mitglied',
};

export function UserManagementTable({
  users,
  currentUserId,
  currentUserRoles,
  clubSlug,
  onRefresh,
}: UserManagementTableProps) {
  const [editUser, setEditUser] = useState<ClubUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [removeUser, setRemoveUser] = useState<ClubUser | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const { toast } = useToast();

  const handleEditRoles = (user: ClubUser) => {
    setEditUser(user);
    setDialogOpen(true);
  };

  const handleSaveRoles = async (clubUserId: string, roles: string[]) => {
    const response = await fetch(`/api/clubs/${clubSlug}/users/${clubUserId}/roles`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roles }),
    });

    if (!response.ok) {
      const error = await response.json();
      toast({
        title: 'Fehler',
        description: error.message || 'Rollen konnten nicht aktualisiert werden.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Gespeichert',
      description: 'Rollen wurden aktualisiert.',
    });
    onRefresh();
  };

  const handleRemoveClick = (user: ClubUser) => {
    if (user.userId === currentUserId) {
      toast({
        title: 'Nicht erlaubt',
        description: 'Du kannst dich nicht selbst entfernen.',
        variant: 'destructive',
      });
      return;
    }
    setRemoveUser(user);
    setRemoveDialogOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!removeUser) return;

    setRemoving(true);
    try {
      const response = await fetch(`/api/clubs/${clubSlug}/users/${removeUser.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        toast({
          title: 'Fehler',
          description: error.message || 'Benutzer konnte nicht entfernt werden.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Entfernt',
        description: `${removeUser.name} wurde aus dem Verein entfernt.`,
      });
      onRefresh();
    } finally {
      setRemoving(false);
      setRemoveUser(null);
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>E-Mail</TableHead>
            <TableHead>Rollen</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const isSelf = user.userId === currentUserId;

            return (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.name}
                  {isSelf && <span className="ml-2 text-xs text-muted-foreground">(Du)</span>}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                      <Badge key={role} variant="secondary">
                        {ROLE_LABELS[role] || role}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Aktionen</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditRoles(user)}>
                        Rollen bearbeiten
                      </DropdownMenuItem>
                      {!isSelf && (
                        <DropdownMenuItem
                          onClick={() => handleRemoveClick(user)}
                          className="text-destructive"
                        >
                          Aus Verein entfernen
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <RoleEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={editUser}
        currentUserRoles={currentUserRoles}
        isSelfEdit={editUser?.userId === currentUserId}
        onSave={handleSaveRoles}
      />

      <ConfirmDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        title="Benutzer entfernen"
        description={`Möchtest du ${removeUser?.name ?? 'diesen Benutzer'} wirklich aus dem Verein entfernen?`}
        confirmLabel="Entfernen"
        cancelLabel="Abbrechen"
        variant="destructive"
        onConfirm={handleConfirmRemove}
        loading={removing}
      />
    </>
  );
}
