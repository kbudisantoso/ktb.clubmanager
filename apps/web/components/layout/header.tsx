"use client"

import Link from "next/link"
import Image from "next/image"
import dynamic from "next/dynamic"

// Dynamically import UserMenu to avoid SSG issues with useSession hook
// The UserMenu uses better-auth's useSession which requires client-side context
const UserMenu = dynamic(
  () => import("@/components/auth/user-menu").then((mod) => mod.UserMenu),
  { ssr: false }
)

/**
 * Application header component.
 * Shows logo and user menu for authenticated users.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center">
          <Image
            src="/logo.png"
            alt="ClubManager"
            width={160}
            height={40}
            className="h-8 w-auto"
            priority
          />
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User menu */}
        <UserMenu />
      </div>
    </header>
  )
}
