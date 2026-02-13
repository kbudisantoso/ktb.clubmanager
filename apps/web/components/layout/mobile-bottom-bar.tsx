'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Landmark, Settings, Menu } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { useActiveClub } from '@/lib/club-store';
import { cn } from '@/lib/utils';

interface TabItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  /** If true, this tab opens the sidebar instead of navigating */
  action?: 'toggle-sidebar';
  /** If true, the tab is disabled (coming soon) */
  disabled?: boolean;
  /** Path prefix to match for active state */
  matchPrefix?: string;
}

function getClubTabs(slug: string): TabItem[] {
  return [
    {
      label: 'Übersicht',
      icon: LayoutDashboard,
      href: `/clubs/${slug}/dashboard`,
      matchPrefix: `/clubs/${slug}/dashboard`,
    },
    {
      label: 'Mitglieder',
      icon: Users,
      href: `/clubs/${slug}/members`,
      matchPrefix: `/clubs/${slug}/members`,
    },
    {
      label: 'Finanzen',
      icon: Landmark,
      disabled: true,
    },
    {
      label: 'Einstellungen',
      icon: Settings,
      href: `/clubs/${slug}/settings`,
      matchPrefix: `/clubs/${slug}/settings`,
    },
    {
      label: 'Mehr',
      icon: Menu,
      action: 'toggle-sidebar',
    },
  ];
}

/**
 * Mobile bottom tab bar navigation.
 *
 * Only renders when there is an active club context.
 * Shows 5 primary tabs: Übersicht, Mitglieder, Finanzen (disabled),
 * Einstellungen, and Mehr (toggles the sidebar sheet).
 *
 * Visible only on screens < md (md:hidden).
 */
export function MobileBottomBar() {
  const club = useActiveClub();
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();

  // Only render in club context
  if (!club) return null;

  const tabs = getClubTabs(club.slug);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-safe md:hidden">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = tab.matchPrefix ? pathname.startsWith(tab.matchPrefix) : false;
          const Icon = tab.icon;

          if (tab.action === 'toggle-sidebar') {
            return (
              <button
                key={tab.label}
                type="button"
                onClick={toggleSidebar}
                className="flex flex-1 flex-col items-center gap-0.5 py-2 text-muted-foreground transition-colors active:text-primary"
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{tab.label}</span>
              </button>
            );
          }

          if (tab.disabled) {
            return (
              <span
                key={tab.label}
                className="flex flex-1 flex-col items-center gap-0.5 py-2 text-muted-foreground/50"
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{tab.label}</span>
              </span>
            );
          }

          return (
            <Link
              key={tab.label}
              href={tab.href!}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
