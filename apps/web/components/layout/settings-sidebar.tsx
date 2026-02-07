'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Bell, Building2, Settings, Users, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useActiveClub } from '@/lib/club-store';
import { useCanManageSettings } from '@/lib/club-permissions';

/**
 * Shared sidebar for all settings pages.
 * - Personal section: always shown
 * - Club section: shown when user has admin access (OWNER/ADMIN) to active club
 */
export function SettingsSidebar() {
  const pathname = usePathname();
  const activeClub = useActiveClub();
  const canManageSettings = useCanManageSettings();

  const personalItems = [
    { href: '/settings/profile', label: 'Profil', icon: User },
    { href: '/settings/my-clubs', label: 'Meine Vereine', icon: Building2 },
    { href: '/settings/notifications', label: 'Benachrichtigungen', icon: Bell },
  ];

  // Club settings items - based on active club from store (not URL)
  const clubBasePath = activeClub ? `/clubs/${activeClub.slug}/settings` : '';
  const clubSettingsItems = activeClub
    ? [
        { href: clubBasePath, label: 'Allgemein', icon: Settings },
        { href: `${clubBasePath}/users`, label: 'Benutzer', icon: Users },
        { href: `${clubBasePath}/invites`, label: 'Einladungen', icon: Key },
      ]
    : [];

  return (
    <nav className="w-full md:w-56 shrink-0">
      <div className="glass-card rounded-xl border p-4 space-y-6">
        {/* Personal Section */}
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
            Persönlich
          </div>
          <div className="space-y-1">
            {personalItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href === '/settings/profile' && pathname === '/settings');
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn('w-full justify-start gap-2')}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Club Settings Section - shown when user can manage settings (OWNER/ADMIN) */}
        {activeClub && canManageSettings && (
          <div>
            <div
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2 truncate"
              title={activeClub.name}
            >
              {activeClub.name}
            </div>
            <div className="space-y-1">
              {clubSettingsItems.map((item) => {
                const isActive =
                  item.href === clubBasePath
                    ? pathname === clubBasePath
                    : pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      className={cn('w-full justify-start gap-2')}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
