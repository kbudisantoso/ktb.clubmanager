import Link from "next/link"
import { UserMenu } from "@/components/auth/user-menu"

/**
 * Application header component.
 * Shows logo and user menu for authenticated users.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="font-display font-bold text-primary">
            ktb.clubmanager
          </span>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User menu */}
        <UserMenu />
      </div>
    </header>
  )
}
