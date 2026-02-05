"use client"

import { useEffect, useState } from "react"
import { Save } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

interface Settings {
  "club.selfServiceCreation": boolean
  "club.defaultVisibility": "PUBLIC" | "PRIVATE"
  "club.defaultTierId": string | null
  "tier.graceperiodDays": number
  "mode.saas": boolean
}

interface Tier {
  id: string
  name: string
}

export default function AdminSettingsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [tiers, setTiers] = useState<Tier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    Promise.all([fetchSettings(), fetchTiers()]).then(() => setIsLoading(false))
  }, [])

  async function fetchSettings() {
    const res = await apiFetch("/api/admin/settings")
    if (res.ok) {
      const data = await res.json()
      setSettings(data)
    }
  }

  async function fetchTiers() {
    const res = await apiFetch("/api/admin/tiers")
    if (res.ok) {
      const data = await res.json()
      setTiers(data)
    }
  }

  async function handleSave() {
    if (!settings) return

    setIsSaving(true)
    try {
      const res = await apiFetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (res.ok) {
        toast({ title: "Einstellungen gespeichert" })
      } else {
        const error = await res.json()
        toast({
          title: "Fehler",
          description: error.message,
          variant: "destructive",
        })
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !settings) {
    return <div className="p-8">Laden...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Einstellungen</h1>
          <p className="text-muted-foreground">Systemweite Konfiguration</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          Speichern
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Club Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Vereine</CardTitle>
            <CardDescription>
              Einstellungen für die Vereinserstellung und -verwaltung
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Self-Service Vereinserstellung</Label>
                <p className="text-sm text-muted-foreground">
                  Benutzer können selbst Vereine erstellen
                </p>
              </div>
              <Switch
                checked={settings["club.selfServiceCreation"]}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, "club.selfServiceCreation": checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Standard-Sichtbarkeit</Label>
              <Select
                value={settings["club.defaultVisibility"]}
                onValueChange={(value: "PUBLIC" | "PRIVATE") =>
                  setSettings({ ...settings, "club.defaultVisibility": value })
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIVATE">Privat</SelectItem>
                  <SelectItem value="PUBLIC">Öffentlich</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Standard-Tarif</Label>
              <Select
                value={settings["club.defaultTierId"] || "none"}
                onValueChange={(value) =>
                  setSettings({
                    ...settings,
                    "club.defaultTierId": value === "none" ? null : value,
                  })
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Kein Standard" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kein Standard</SelectItem>
                  {tiers.map((tier) => (
                    <SelectItem key={tier.id} value={tier.id}>
                      {tier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tier Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Tarife</CardTitle>
            <CardDescription>Einstellungen für das Tarifsystem</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Karenzzeit bei Downgrade (Tage)</Label>
              <Input
                type="number"
                min="1"
                max="90"
                value={settings["tier.graceperiodDays"]}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    "tier.graceperiodDays": parseInt(e.target.value) || 14,
                  })
                }
                className="w-[100px]"
              />
              <p className="text-sm text-muted-foreground">
                Zeitraum nach einem Downgrade, bevor Limits durchgesetzt werden
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Mode Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Modus</CardTitle>
            <CardDescription>Betriebsmodus der Anwendung</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>SaaS-Modus</Label>
                <p className="text-sm text-muted-foreground">
                  Zeigt Upgrade-Prompts für deaktivierte Funktionen (statt sie zu
                  verstecken)
                </p>
              </div>
              <Switch
                checked={settings["mode.saas"]}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, "mode.saas": checked })
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
