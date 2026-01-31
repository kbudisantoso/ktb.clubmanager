"use client"

import { useEffect, useState } from "react"
import { Plus, Pencil, Trash2, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

interface Tier {
  id: string
  name: string
  description?: string
  isVisible: boolean
  isSeeded: boolean
  sortOrder: number
  color?: string
  usersLimit?: number
  membersLimit?: number
  storageLimit?: number
  sepaEnabled: boolean
  reportsEnabled: boolean
  bankImportEnabled: boolean
  _count?: { clubs: number }
}

export default function AdminTiersPage() {
  const { toast } = useToast()
  const [tiers, setTiers] = useState<Tier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingTier, setEditingTier] = useState<Tier | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    fetchTiers()
  }, [])

  async function fetchTiers() {
    try {
      const res = await fetch("/api/admin/tiers", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setTiers(data)
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave(formData: FormData) {
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      isVisible: formData.get("isVisible") === "on",
      usersLimit: formData.get("usersLimit")
        ? Number(formData.get("usersLimit"))
        : null,
      membersLimit: formData.get("membersLimit")
        ? Number(formData.get("membersLimit"))
        : null,
      storageLimit: formData.get("storageLimit")
        ? Number(formData.get("storageLimit"))
        : null,
      sepaEnabled: formData.get("sepaEnabled") === "on",
      reportsEnabled: formData.get("reportsEnabled") === "on",
      bankImportEnabled: formData.get("bankImportEnabled") === "on",
    }

    try {
      const url = editingTier
        ? `/api/admin/tiers/${editingTier.id}`
        : "/api/admin/tiers"
      const method = editingTier ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      })

      if (res.ok) {
        toast({
          title: editingTier ? "Tarif aktualisiert" : "Tarif erstellt",
        })
        fetchTiers()
        setIsDialogOpen(false)
        setEditingTier(null)
      } else {
        const error = await res.json()
        toast({
          title: "Fehler",
          description: error.message,
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Fehler",
        description: "Netzwerkfehler",
        variant: "destructive",
      })
    }
  }

  async function handleDelete(tier: Tier) {
    if (!confirm(`Tarif "${tier.name}" wirklich loschen?`)) return

    try {
      const res = await fetch(`/api/admin/tiers/${tier.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (res.ok) {
        toast({ title: "Tarif geloscht" })
        fetchTiers()
      } else {
        const error = await res.json()
        toast({
          title: "Fehler",
          description: error.message,
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Fehler",
        description: "Netzwerkfehler",
        variant: "destructive",
      })
    }
  }

  const formatLimit = (limit?: number | null) =>
    limit ? limit.toString() : "Unbegrenzt"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tarife</h1>
          <p className="text-muted-foreground">
            Verwalte die verfugbaren Tarife und deren Funktionen
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingTier(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Neuer Tarif
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTier ? "Tarif bearbeiten" : "Neuer Tarif"}
              </DialogTitle>
            </DialogHeader>
            <form action={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingTier?.name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingTier?.description}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="usersLimit">Max. Benutzer</Label>
                  <Input
                    id="usersLimit"
                    name="usersLimit"
                    type="number"
                    min="1"
                    defaultValue={editingTier?.usersLimit || ""}
                    placeholder="Unbegrenzt"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="membersLimit">Max. Mitglieder</Label>
                  <Input
                    id="membersLimit"
                    name="membersLimit"
                    type="number"
                    min="1"
                    defaultValue={editingTier?.membersLimit || ""}
                    placeholder="Unbegrenzt"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storageLimit">Speicher (MB)</Label>
                  <Input
                    id="storageLimit"
                    name="storageLimit"
                    type="number"
                    min="1"
                    defaultValue={editingTier?.storageLimit || ""}
                    placeholder="Unbegrenzt"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sepaEnabled">SEPA-Lastschrift</Label>
                  <Switch
                    id="sepaEnabled"
                    name="sepaEnabled"
                    defaultChecked={editingTier?.sepaEnabled ?? true}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="reportsEnabled">Berichte</Label>
                  <Switch
                    id="reportsEnabled"
                    name="reportsEnabled"
                    defaultChecked={editingTier?.reportsEnabled ?? true}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="bankImportEnabled">Bank-Import</Label>
                  <Switch
                    id="bankImportEnabled"
                    name="bankImportEnabled"
                    defaultChecked={editingTier?.bankImportEnabled ?? true}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="isVisible">Sichtbar</Label>
                  <Switch
                    id="isVisible"
                    name="isVisible"
                    defaultChecked={editingTier?.isVisible ?? true}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button type="submit">Speichern</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarif</TableHead>
              <TableHead>Limits</TableHead>
              <TableHead>Funktionen</TableHead>
              <TableHead className="text-right">Vereine</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Laden...
                </TableCell>
              </TableRow>
            ) : (
              tiers.map((tier) => (
                <TableRow key={tier.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {tier.isSeeded && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                      <span className="font-medium">{tier.name}</span>
                      {!tier.isVisible && (
                        <Badge variant="outline" className="text-xs">
                          Versteckt
                        </Badge>
                      )}
                    </div>
                    {tier.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {tier.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm space-y-1">
                      <div>Benutzer: {formatLimit(tier.usersLimit)}</div>
                      <div>Mitglieder: {formatLimit(tier.membersLimit)}</div>
                      <div>
                        Speicher:{" "}
                        {tier.storageLimit
                          ? `${tier.storageLimit} MB`
                          : "Unbegrenzt"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {tier.sepaEnabled && (
                        <Badge variant="secondary">SEPA</Badge>
                      )}
                      {tier.reportsEnabled && (
                        <Badge variant="secondary">Berichte</Badge>
                      )}
                      {tier.bankImportEnabled && (
                        <Badge variant="secondary">Bank-Import</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {tier._count?.clubs || 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingTier(tier)
                          setIsDialogOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={tier.isSeeded}
                        onClick={() => handleDelete(tier)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
