"use client"

import Link from "next/link"
import { Shield } from "lucide-react"
import { useSession } from "@/lib/auth-client"
import { ClubSwitcher } from "@/components/club-switcher"
import { Button } from "@/components/ui/button"

// Extended session type with isSuperAdmin
interface ExtendedUser {
  id: string
  email: string
  name?: string
  isSuperAdmin?: boolean
}

/**
 * Header actions: Club switcher and admin link.
 * Only rendered for authenticated users.
 */
export function HeaderActions() {
  const { data: session } = useSession()

  if (!session?.user) {
    return null
  }

  const user = session.user as ExtendedUser

  return (
    <div className="flex items-center gap-4">
      <ClubSwitcher />

      {/* Super Admin link - Kommandozentrale */}
      {user.isSuperAdmin && (
        <Link href="/admin">
          <Button variant="ghost" size="sm" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Kommandozentrale</span>
          </Button>
        </Link>
      )}
    </div>
  )
}
