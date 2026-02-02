"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { authClient } from "@/lib/auth-client"
import { useSessionQuery, useClearSession } from "@/hooks/use-session"
import { useMyClubsQuery } from "@/hooks/use-clubs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getAuthBroadcast } from "@/lib/broadcast-auth"
import { LogOut, User, Shield, Moon, Sun, Settings, ArrowLeftRight } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useActiveClub } from "@/lib/club-store"
import { useCanManageSettings } from "@/lib/club-permissions"
import { ClubSwitcherModal } from "@/components/club-switcher/club-switcher-modal"

/**
 * User menu dropdown component.
 * Shows avatar with dropdown for profile, settings, and sign out.
 * Per CONTEXT.md: Primary sign-out location in header.
 */
export function UserMenu() {
  const { data: session, isLoading } = useSessionQuery()
  const { data: clubsData } = useMyClubsQuery()
  const clearSession = useClearSession()
  const { theme, setTheme } = useTheme()
  const activeClub = useActiveClub()
  const canManageSettings = useCanManageSettings()
  const [showClubSwitcher, setShowClubSwitcher] = useState(false)

  const clubs = clubsData?.clubs ?? []
  const canCreateClub = clubsData?.canCreateClub ?? false
  const hasMultipleClubs = clubs.length >= 2

  // Show skeleton while loading
  if (isLoading) {
    return <Skeleton className="h-8 w-8 rounded-full" />
  }

  // Don't render when not authenticated
  if (!session?.user) {
    return null
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const { user } = session

  // Get initials for avatar fallback (null if no name)
  // Use first letter of first word + first letter of last word
  const initials = user.name
    ? (() => {
        const words = user.name.split(" ").filter(Boolean)
        if (words.length >= 2) {
          return (words[0][0] + words[words.length - 1][0]).toUpperCase()
        }
        return words[0]?.[0]?.toUpperCase() || null
      })()
    : null

  const handleSignOut = async () => {
    // Notify other tabs BEFORE signing out
    const authBroadcast = getAuthBroadcast()
    authBroadcast.notifyLogout()
    authBroadcast.clearAuthState()

    // Clear session from React Query cache
    clearSession()

    // Sign out with Better Auth
    await authClient.signOut()

    // Redirect to login
    window.location.href = "/login?signedOut=true"
  }

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-1 focus-visible:ring-border"
          aria-label="Benutzermenu"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={user.image ?? undefined}
              alt={user.name ?? "Avatar"}
            />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {initials ?? <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.name || "Benutzer"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/settings" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Einstellungen</span>
          </a>
        </DropdownMenuItem>
        {activeClub && canManageSettings && (
          <DropdownMenuItem asChild>
            <a href={`/clubs/${activeClub.slug}/settings`} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Vereinsverwaltung</span>
            </a>
          </DropdownMenuItem>
        )}
        {user.isSuperAdmin && (
          <DropdownMenuItem asChild>
            <a href="/admin" className="cursor-pointer">
              <Shield className="mr-2 h-4 w-4" />
              <span>Verwaltungszentrale</span>
            </a>
          </DropdownMenuItem>
        )}
        {hasMultipleClubs && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowClubSwitcher(true)}
              className="cursor-pointer"
            >
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              <span>Verein wechseln</span>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
          {theme === "dark" ? (
            <Sun className="mr-2 h-4 w-4" />
          ) : (
            <Moon className="mr-2 h-4 w-4" />
          )}
          <span>{theme === "dark" ? "Hell" : "Dunkel"}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer"
          variant="destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Abmelden</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <ClubSwitcherModal
      open={showClubSwitcher}
      onOpenChange={setShowClubSwitcher}
      canCreateClub={canCreateClub}
    />
  </>
  )
}
