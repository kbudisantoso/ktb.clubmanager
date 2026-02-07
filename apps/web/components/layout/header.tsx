'use client';

import Link from 'next/link';
import Image from 'next/image';
import { UserMenu } from '@/components/auth/user-menu';
import { HeaderActions } from './header-actions';
import { ClubBadge } from '@/components/club-switcher/club-badge';

/**
 * Application header component.
 * Layout: Logo (left) | Navigation (center) | User menu (right)
 */
export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-transparent backdrop-blur-sm">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo - Left */}
        <Link href="/dashboard" className="flex items-center shrink-0">
          <Image
            src="/logo.svg"
            alt="ClubManager"
            width={160}
            height={40}
            className="h-8 w-auto dark:hidden"
            priority
          />
          <Image
            src="/logo-darkbg.svg"
            alt="ClubManager"
            width={160}
            height={40}
            className="h-8 w-auto hidden dark:block"
            priority
          />
        </Link>

        {/* Navigation - Center */}
        <HeaderActions />

        {/* Club badge + User menu - Right */}
        <div className="flex items-center gap-3">
          <ClubBadge />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
