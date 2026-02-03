"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Users, BookOpen } from "lucide-react"
import { useSessionQuery } from "@/hooks/use-session"
import { useActiveClub } from "@/lib/club-store"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * Module navigation items for the header.
 * Only shown when a club is active.
 */
const MODULE_ITEMS = [
  { path: "members", label: "Mitglieder", icon: Users },
  { path: "accounting", label: "Buchhaltung", icon: BookOpen },
] as const

/**
 * Header navigation: centered module links.
 * Shows module navigation when a club is active.
 */
export function HeaderActions() {
  const { data: session, isLoading } = useSessionQuery()
  const pathname = usePathname()
  const activeClub = useActiveClub()

  // Show skeleton while loading
  if (isLoading) {
    return (
      <nav className="flex items-center gap-1">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </nav>
    )
  }

  if (!session?.user) {
    return null
  }

  // No navigation when no active club
  if (!activeClub) {
    return null
  }

  return (
    <nav className="flex items-center gap-1">
      {MODULE_ITEMS.map((item) => {
        const href = `/clubs/${activeClub.slug}/${item.path}`
        const isActive = pathname.startsWith(href)

        return (
          <Link
            key={item.path}
            href={href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
              isActive
                ? "bg-primary/15 text-primary"
                : "text-foreground/70 hover:text-foreground hover:bg-primary/10"
            )}
          >
            <item.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
