"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Plus, Search, Building2 } from "lucide-react"
import { useClubStore, useMyClubs, useNeedsClubRefresh, type ClubContext } from "@/lib/club-store"
import { ClubAvatar } from "./club-avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/**
 * Role display configuration (German labels)
 */
const ROLE_LABELS: Record<string, string> = {
  OWNER: "Inhaber",
  ADMIN: "Admin",
  TREASURER: "Kassenwart",
  VIEWER: "Mitglied",
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-purple-100 text-purple-800",
  ADMIN: "bg-blue-100 text-blue-800",
  TREASURER: "bg-green-100 text-green-800",
  VIEWER: "bg-gray-100 text-gray-800",
}

interface ClubSwitcherProps {
  className?: string
}

/**
 * Club switcher dropdown for the header.
 * Shows current club and allows switching between clubs.
 */
export function ClubSwitcher({ className }: ClubSwitcherProps) {
  const router = useRouter()
  const clubs = useMyClubs()
  const needsRefresh = useNeedsClubRefresh()
  const { activeClubSlug, setActiveClub, setClubs } = useClubStore()

  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Fetch clubs on mount if needed
  useEffect(() => {
    if (needsRefresh) {
      fetchClubs()
    }
  }, [needsRefresh])

  async function fetchClubs() {
    setIsLoading(true)
    try {
      const res = await fetch("/api/clubs/my", {
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        setClubs(
          data.map((club: ClubContext & Record<string, unknown>) => ({
            id: club.id,
            name: club.name,
            slug: club.slug,
            role: club.role,
            avatarUrl: club.avatarUrl,
            avatarInitials: club.avatarInitials,
            avatarColor: club.avatarColor,
          }))
        )
      }
    } catch (error) {
      console.error("Failed to fetch clubs:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Get active club object
  const activeClub = clubs.find((c) => c.slug === activeClubSlug)

  // Filter clubs by search
  const filteredClubs = searchQuery
    ? clubs.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : clubs

  // Show search when 5+ clubs
  const showSearch = clubs.length >= 5

  function handleSelectClub(club: ClubContext) {
    setActiveClub(club.slug)
    router.push(`/clubs/${club.slug}/dashboard`)
  }

  function handleCreateClub() {
    router.push("/clubs/new")
  }

  // No clubs state
  if (clubs.length === 0 && !isLoading) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleCreateClub}
        className={cn("gap-2", className)}
      >
        <Plus className="h-4 w-4" />
        Verein erstellen
      </Button>
    )
  }

  // Single club - just show name, no dropdown
  if (clubs.length === 1) {
    const club = clubs[0]
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <ClubAvatar
          name={club.name}
          avatarUrl={club.avatarUrl}
          avatarInitials={club.avatarInitials}
          avatarColor={club.avatarColor}
          size="sm"
        />
        <span className="text-sm font-medium truncate max-w-[150px]">
          {club.name}
        </span>
      </div>
    )
  }

  // Multiple clubs - show dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-2 min-w-[200px] justify-between", className)}
        >
          {activeClub ? (
            <div className="flex items-center gap-2">
              <ClubAvatar
                name={activeClub.name}
                avatarUrl={activeClub.avatarUrl}
                avatarInitials={activeClub.avatarInitials}
                avatarColor={activeClub.avatarColor}
                size="sm"
              />
              <span className="truncate max-w-[120px]">{activeClub.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>Verein auswählen</span>
            </div>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[280px]">
        {showSearch && (
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Verein suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        )}

        <div className="max-h-[300px] overflow-y-auto">
          {filteredClubs.map((club) => (
            <DropdownMenuItem
              key={club.id}
              onClick={() => handleSelectClub(club)}
              className={cn(
                "flex items-center gap-3 p-3 cursor-pointer",
                club.slug === activeClubSlug && "bg-accent"
              )}
            >
              <ClubAvatar
                name={club.name}
                avatarUrl={club.avatarUrl}
                avatarInitials={club.avatarInitials}
                avatarColor={club.avatarColor}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{club.name}</div>
                <Badge
                  variant="secondary"
                  className={cn("text-xs mt-1", ROLE_COLORS[club.role])}
                >
                  {ROLE_LABELS[club.role] || club.role}
                </Badge>
              </div>
            </DropdownMenuItem>
          ))}

          {filteredClubs.length === 0 && searchQuery && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Keine Vereine gefunden
            </div>
          )}
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleCreateClub} className="gap-2">
          <Plus className="h-4 w-4" />
          Neuen Verein erstellen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
