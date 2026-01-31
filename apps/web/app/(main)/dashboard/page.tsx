"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { useMyClubs, useClubStore } from "@/lib/club-store"
import { Building2, Key, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function DashboardPage() {
  const router = useRouter()
  const { data: session, isPending: sessionLoading } = useSession()
  const clubs = useMyClubs()
  const { activeClubSlug, setActiveClub, setClubs } = useClubStore()

  const [inviteCode, setInviteCode] = useState("")
  const [isLoadingClubs, setIsLoadingClubs] = useState(true)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      router.push("/login")
    }
  }, [session, sessionLoading, router])

  // Fetch clubs on mount
  useEffect(() => {
    if (session?.user) {
      fetchClubs()
    }
  }, [session?.user])

  // Auto-redirect to active club if set
  useEffect(() => {
    if (!isLoadingClubs && activeClubSlug && clubs.length > 0) {
      const club = clubs.find((c) => c.slug === activeClubSlug)
      if (club) {
        router.push(`/clubs/${club.slug}/dashboard`)
      }
    }
  }, [isLoadingClubs, activeClubSlug, clubs, router])

  // Auto-select single club
  useEffect(() => {
    if (!isLoadingClubs && clubs.length === 1 && !activeClubSlug) {
      setActiveClub(clubs[0].slug)
      router.push(`/clubs/${clubs[0].slug}/dashboard`)
    }
  }, [isLoadingClubs, clubs, activeClubSlug, setActiveClub, router])

  async function fetchClubs() {
    try {
      const res = await fetch("/api/clubs/my", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setClubs(
          data.map((club: Record<string, unknown>) => ({
            id: club.id as string,
            name: club.name as string,
            slug: club.slug as string,
            role: club.role as string,
            avatarUrl: club.avatarUrl as string | undefined,
            avatarInitials: club.avatarInitials as string | undefined,
            avatarColor: club.avatarColor as string | undefined,
          }))
        )
      }
    } finally {
      setIsLoadingClubs(false)
    }
  }

  function handleJoinWithCode() {
    if (inviteCode.trim()) {
      // Normalize code: remove dashes and spaces
      const normalized = inviteCode.replace(/[\s-]/g, "").toUpperCase()
      router.push(`/join/${normalized.slice(0, 4)}-${normalized.slice(4)}`)
    }
  }

  function handleCreateClub() {
    router.push("/clubs/new")
  }

  if (sessionLoading || isLoadingClubs) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // No clubs empty state
  if (clubs.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-8">
          <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Willkommen bei ktb.clubmanager</h1>
          <p className="text-muted-foreground">
            Du bist noch keinem Verein zugeordnet. Erstelle einen neuen Verein oder tritt einem bestehenden bei.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Create club card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Verein erstellen
              </CardTitle>
              <CardDescription>
                Starte mit einem neuen Verein und lade Mitglieder ein.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleCreateClub} className="w-full gap-2">
                Verein erstellen
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Join with code card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Einladungscode
              </CardTitle>
              <CardDescription>
                Du hast einen Einladungscode erhalten? Gib ihn hier ein.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="XXXX-XXXX"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="font-mono text-center text-lg tracking-wider"
                maxLength={9}
              />
              <Button
                onClick={handleJoinWithCode}
                variant="outline"
                className="w-full gap-2"
                disabled={inviteCode.replace(/[\s-]/g, "").length < 8}
              >
                Code einlösen
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Multiple clubs - show selector (should rarely reach here due to auto-redirect)
  if (clubs.length > 1 && !activeClubSlug) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Verein auswählen</h1>
          <p className="text-muted-foreground">
            Wähle den Verein aus, mit dem du arbeiten möchtest.
          </p>
        </div>

        <div className="space-y-4">
          {clubs.map((club) => (
            <Card
              key={club.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => {
                setActiveClub(club.slug)
                router.push(`/clubs/${club.slug}/dashboard`)
              }}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold">
                  {club.avatarInitials || club.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{club.name}</div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {club.role.toLowerCase()}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Fallback loading state (during redirect)
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}
