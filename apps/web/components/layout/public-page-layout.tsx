import Link from 'next/link';
import Image from 'next/image';
import { PublicHeaderAuth } from './public-header-auth';
import { LegalFooterLinks } from './legal-links';

interface PublicPageLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout for public pages (Impressum, Datenschutz, etc.)
 * Matches the app's glassmorphism design but styled as a public website.
 * Shows UserMenu when logged in, "Anmelden" link when not.
 */
export function PublicPageLayout({ children }: PublicPageLayoutProps) {
  // Background is in root layout
  return (
    <div className="min-h-screen flex flex-col">
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
          <PublicHeaderAuth />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto max-w-3xl py-8 px-4">
        <div className="glass-panel rounded-2xl p-8 sm:p-10">{children}</div>
      </main>

      {/* Footer */}
      <footer className="py-6">
        <div className="container mx-auto px-4 text-center text-xs text-foreground/70 space-x-4">
          <LegalFooterLinks />
        </div>
      </footer>
    </div>
  );
}
