"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface ClubUser {
  id: string
  userId: string
  name: string
  email: string
  roles: string[]
}

interface RoleEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: ClubUser | null
  currentUserRoles: string[]
  onSave: (userId: string, roles: string[]) => Promise<void>
}

const ROLE_CONFIG = [
  {
    value: "OWNER",
    label: "Inhaber",
    description: "Kann Vereinsdaten löschen und Inhaber ernennen",
    ownerOnly: true,
  },
  {
    value: "ADMIN",
    label: "Admin",
    description: "Kann Benutzer verwalten und Einstellungen ändern",
    ownerOnly: false,
  },
  {
    value: "TREASURER",
    label: "Kassierer",
    description: "Kann Finanzen und Mitglieder verwalten",
    ownerOnly: false,
  },
  {
    value: "SECRETARY",
    label: "Schriftführer",
    description: "Kann Kontaktdaten bearbeiten und Daten exportieren",
    ownerOnly: false,
  },
  {
    value: "MEMBER",
    label: "Mitglied",
    description: "Kann eigenes Profil sehen und bearbeiten",
    ownerOnly: false,
  },
] as const

export function RoleEditDialog({
  open,
  onOpenChange,
  user,
  currentUserRoles,
  onSave,
}: RoleEditDialogProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const isCurrentUserOwner = currentUserRoles.includes("OWNER")

  useEffect(() => {
    if (user) {
      setSelectedRoles([...user.roles])
    }
  }, [user])

  const handleRoleToggle = (role: string, checked: boolean) => {
    setSelectedRoles((prev) =>
      checked ? [...prev, role] : prev.filter((r) => r !== role)
    )
  }

  const handleSave = async () => {
    if (!user || selectedRoles.length === 0) return

    setSaving(true)
    try {
      await onSave(user.id, selectedRoles)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rollen bearbeiten</DialogTitle>
          <DialogDescription>
            Rollen für {user.name} verwalten
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {ROLE_CONFIG.map((role) => {
            const disabled = role.ownerOnly && !isCurrentUserOwner

            return (
              <div key={role.value} className="flex items-start space-x-3">
                <Checkbox
                  id={role.value}
                  checked={selectedRoles.includes(role.value)}
                  onCheckedChange={(checked) =>
                    handleRoleToggle(role.value, checked === true)
                  }
                  disabled={disabled}
                />
                <div className="space-y-1">
                  <Label
                    htmlFor={role.value}
                    className={disabled ? "text-muted-foreground" : ""}
                  >
                    {role.label}
                    {disabled && " (nur für Inhaber)"}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {role.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || selectedRoles.length === 0}
          >
            {saving ? "Speichern..." : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
