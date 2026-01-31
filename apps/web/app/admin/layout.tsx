"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useSession } from "@/lib/auth-client"
import {
  Shield,
  Building2,
  Layers,
  Settings,
  Loader2,
  Home,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { href: "/admin", label: "Ubersicht", icon: Home },
  { href: "/admin/clubs", label: "Vereine", icon: Building2 },
  { href: "/admin/tiers", label: "Tarife", icon: Layers },
  { href: "/admin/settings", label: "Einstellungen", icon: Settings },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, isPending: sessionLoading } = useSession()

  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null)

  // Check Super Admin status
  useEffect(() => {
    if (sessionLoading) return

    if (!session?.user) {
      router.push("/login?callbackUrl=/admin")
      return
    }

    checkSuperAdmin()
  }, [session, sessionLoading, router])

  async function checkSuperAdmin() {
    try {
      const res = await fetch("/api/users/me", { credentials: "include" })
      if (res.ok) {
        const user = await res.json()
        if (user.isSuperAdmin) {
          setIsSuperAdmin(true)
        } else {
          setIsSuperAdmin(false)
          router.push("/dashboard")
        }
      } else {
        router.push("/login?callbackUrl=/admin")
      }
    } catch {
      router.push("/dashboard")
    }
  }

  if (sessionLoading || isSuperAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isSuperAdmin === false) {
    return null // Will redirect
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/40 flex flex-col">
        <div className="p-4 border-b">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <Shield className="h-5 w-5 text-primary" />
            <span>Kommandozentrale</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={pathname === item.href ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2",
                  pathname === item.href && "bg-secondary"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t">
          <Link href="/dashboard">
            <Button variant="outline" className="w-full">
              Zuruck zur App
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
