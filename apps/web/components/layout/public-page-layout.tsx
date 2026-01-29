import Link from "next/link"
import Image from "next/image"

interface PublicPageLayoutProps {
  children: React.ReactNode
}

/**
 * Layout for public pages (Impressum, Datenschutz, etc.)
 * Matches the app's glassmorphism design but styled as a public website.
 */
export function PublicPageLayout({ children }: PublicPageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Background */}
      <div className="app-background" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-transparent backdrop-blur-sm">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.svg"
              alt="ClubManager"
              width={140}
              height={35}
              className="h-7 w-auto dark:hidden"
              priority
            />
            <Image
              src="/logo-darkbg.svg"
              alt="ClubManager"
              width={140}
              height={35}
              className="h-7 w-auto hidden dark:block"
              priority
            />
          </Link>
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Anmelden
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto max-w-3xl py-8 px-4">
        <div className="glass-panel rounded-2xl p-8 sm:p-10">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground/70 space-x-4">
          <Link
            href="/impressum"
            className="hover:text-foreground transition-colors"
          >
            Impressum
          </Link>
          <Link
            href="/datenschutz"
            className="hover:text-foreground transition-colors"
          >
            Datenschutz
          </Link>
        </div>
      </footer>
    </div>
  )
}
