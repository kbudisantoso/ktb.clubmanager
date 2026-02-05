"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { useActiveClub } from "@/lib/club-store"
import { UserManagementTable } from "@/components/club/user-management-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserPlus, Loader2 } from "lucide-react"

interface ClubUser {
  id: string
  userId: string
  name: string
  email: string
  image?: string
  roles: string[]
  joinedAt: string
}

export default function UsersSettingsPage() {
  const params = useParams<{ slug: string }>()
  const { data: session } = useSession()
  const activeClub = useActiveClub()
  const [users, setUsers] = useState<ClubUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    if (!params.slug) return

    setLoading(true)
    try {
      const response = await fetch(`/api/clubs/${params.slug}/users`)
      if (!response.ok) {
        throw new Error("Fehler beim Laden der Benutzer")
      }
      const data = await response.json()
      setUsers(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler")
    } finally {
      setLoading(false)
    }
  }, [params.slug])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">{error}</p>
          <Button onClick={fetchUsers} variant="outline" className="mt-4">
            Erneut versuchen
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Benutzer</CardTitle>
              <CardDescription>
                {users.length} Benutzer haben Zugang zu diesem Verein
              </CardDescription>
            </div>
            <Button disabled title="Kommt bald">
              <UserPlus className="h-4 w-4 mr-2" />
              Benutzer einladen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <UserManagementTable
            users={users}
            currentUserId={session?.user?.id ?? ""}
            currentUserRoles={activeClub?.roles ?? []}
            clubSlug={params.slug}
            onRefresh={fetchUsers}
          />
        </CardContent>
      </Card>
    </div>
  )
}
