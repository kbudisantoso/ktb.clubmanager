"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { useSession } from "@/lib/auth-client"

// Dynamically import UserMenu to avoid SSG issues
const UserMenu = dynamic(
  () => import("@/components/auth/user-menu").then((mod) => mod.UserMenu),
  { ssr: false }
)

/**
 * Auth-aware header actions for public pages.
 * Shows UserMenu when logged in, "Anmelden" link when not.
 */
export function PublicHeaderAuth() {
  const { data: session, isPending } = useSession()

  // Show nothing while loading to avoid flash
  if (isPending) {
    return <div className="w-8 h-8" /> // Placeholder for layout stability
  }

  // Show UserMenu if logged in
  if (session?.user) {
    return <UserMenu />
  }

  // Show login link if not logged in
  return (
    <Link
      href="/login"
      className="text-sm text-foreground/80 hover:text-foreground transition-colors"
    >
      Anmelden
    </Link>
  )
}
