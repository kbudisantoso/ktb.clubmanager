"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ClubAvatar } from "@/components/club-switcher/club-avatar"

interface Club {
  id: string
  name: string
  slug: string
  visibility: "PUBLIC" | "PRIVATE"
  avatarInitials?: string
  avatarColor?: string
  tier?: { name: string }
  userCount?: number
  memberCount?: number
  createdAt: string
}

export default function AdminClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchClubs()
  }, [])

  async function fetchClubs() {
    try {
      const res = await fetch("/api/clubs", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setClubs(data)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const filteredClubs = searchQuery
    ? clubs.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.slug.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : clubs

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vereine</h1>
          <p className="text-muted-foreground">
            {clubs.length} Verein{clubs.length !== 1 ? "e" : ""} im System
          </p>
        </div>
        <Button asChild>
          <Link href="/clubs/new">Verein erstellen</Link>
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Verein suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Verein</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Sichtbarkeit</TableHead>
              <TableHead>Tarif</TableHead>
              <TableHead className="text-right">Benutzer</TableHead>
              <TableHead className="text-right">Mitglieder</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Laden...
                </TableCell>
              </TableRow>
            ) : filteredClubs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  Keine Vereine gefunden
                </TableCell>
              </TableRow>
            ) : (
              filteredClubs.map((club) => (
                <TableRow key={club.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <ClubAvatar
                        name={club.name}
                        avatarInitials={club.avatarInitials}
                        avatarColor={club.avatarColor}
                        size="sm"
                      />
                      <span className="font-medium">{club.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{club.slug}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        club.visibility === "PUBLIC" ? "default" : "secondary"
                      }
                    >
                      {club.visibility === "PUBLIC" ? "Offentlich" : "Privat"}
                    </Badge>
                  </TableCell>
                  <TableCell>{club.tier?.name || "-"}</TableCell>
                  <TableCell className="text-right">
                    {club.userCount || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {club.memberCount || 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 justify-end">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/clubs/${club.slug}/dashboard`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
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
