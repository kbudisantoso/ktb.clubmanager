"use client"

import { useTheme } from "next-themes"
import { authClient, useSession } from "@/lib/auth-client"
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
import { LogOut, User, Settings, Moon, Sun } from "lucide-react"

/**
 * User menu dropdown component.
 * Shows avatar with dropdown for profile, settings, and sign out.
 * Per CONTEXT.md: Primary sign-out location in header.
 */
export function UserMenu() {
  const { data: session, isPending } = useSession()
  const { theme, setTheme } = useTheme()

  // Don't render during loading or when not authenticated
  if (isPending || !session?.user) {
    return null
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const { user } = session

  // Get initials for avatar fallback
  const initials =
    user.name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "U"

  const handleSignOut = async () => {
    // Notify other tabs BEFORE signing out
    const authBroadcast = getAuthBroadcast()
    authBroadcast.notifyLogout()
    authBroadcast.clearAuthState()

    // Sign out with Better Auth
    await authClient.signOut()

    // Redirect to login
    window.location.href = "/login?signedOut=true"
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="Benutzermenu"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={user.image ?? undefined}
              alt={user.name ?? "Avatar"}
            />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {initials}
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
          <a href="/settings/profile" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Profil</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/settings/security" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Sicherheit</span>
          </a>
        </DropdownMenuItem>
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
  )
}
