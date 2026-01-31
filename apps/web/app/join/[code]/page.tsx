"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { useClubStore, type ClubContext } from "@/lib/club-store"
import { Loader2, CheckCircle, XCircle, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import Link from "next/link"

type JoinState = "loading" | "success" | "error" | "login-required"

interface JoinResult {
  message: string
  club?: {
    id: string
    name: string
    slug: string
  }
}

export default function JoinPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, isPending: sessionLoading } = useSession()
  const { setActiveClub, setClubs } = useClubStore()

  const [state, setState] = useState<JoinState>("loading")
  const [result, setResult] = useState<JoinResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const code = params.code as string

  useEffect(() => {
    if (sessionLoading) return

    if (!session?.user) {
      setState("login-required")
      return
    }

    joinClub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, sessionLoading, code])

  async function joinClub() {
    try {
      const res = await fetch("/api/clubs/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      })

      const data = await res.json()

      if (!res.ok) {
        setState("error")
        setError(data.message || "Fehler beim Beitreten")
        return
      }

      setResult(data)
      setState("success")

      // Refresh clubs list
      const clubsRes = await fetch("/api/clubs/my", { credentials: "include" })
      if (clubsRes.ok) {
        const clubs = await clubsRes.json()
        setClubs(
          clubs.map(
            (club: {
              id: string
              name: string
              slug: string
              role: string
              avatarUrl?: string
              avatarInitials?: string
              avatarColor?: string
            }): ClubContext => ({
              id: club.id,
              name: club.name,
              slug: club.slug,
              role: club.role,
              avatarUrl: club.avatarUrl,
              avatarInitials: club.avatarInitials,
              avatarColor: club.avatarColor,
            })
          )
        )
      }

      // Set as active club if joining succeeded
      if (data.club?.slug) {
        setActiveClub(data.club.slug)
      }
    } catch {
      setState("error")
      setError("Netzwerkfehler. Bitte versuche es erneut.")
    }
  }

  function handleGoToClub() {
    if (result?.club?.slug) {
      router.push(`/clubs/${result.club.slug}/dashboard`)
    } else {
      router.push("/dashboard")
    }
  }

  function handleLoginRedirect() {
    // Store the join URL to redirect back after login
    const callbackUrl = encodeURIComponent(`/join/${code}`)
    router.push(`/login?callbackUrl=${callbackUrl}`)
  }

  if (sessionLoading || state === "loading") {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Verarbeite Einladung...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state === "login-required") {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <Building2 className="h-12 w-12 mx-auto mb-2 text-primary" />
            <CardTitle>Einladung zu einem Verein</CardTitle>
            <CardDescription>
              Du hast eine Einladung erhalten. Melde dich an oder registriere
              dich, um dem Verein beizutreten.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleLoginRedirect} className="w-full">
              Anmelden
            </Button>
            <Link href={`/register?callbackUrl=/join/${code}`}>
              <Button variant="outline" className="w-full">
                Registrieren
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state === "error") {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 mx-auto mb-2 text-destructive" />
            <CardTitle>Einladung fehlgeschlagen</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => router.push("/dashboard")} className="w-full">
              Zum Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state === "success" && result) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-success" />
            <CardTitle>Willkommen!</CardTitle>
            <CardDescription>{result.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.club && (
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="font-medium">{result.club.name}</p>
              </div>
            )}
            <Button onClick={handleGoToClub} className="w-full">
              Zum Verein
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
