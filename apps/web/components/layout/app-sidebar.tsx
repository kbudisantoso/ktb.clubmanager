'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { ChevronsUpDown } from 'lucide-react';

import { useActiveClub } from '@/lib/club-store';
import { useMyClubsQuery } from '@/hooks/use-clubs';
import { cn } from '@/lib/utils';
import { ClubAvatar } from '@/components/club-switcher/club-avatar';
import { ClubSwitcherModal } from '@/components/club-switcher/club-switcher-modal';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { SidebarUserMenu } from './sidebar-user-menu';

import { getClubNavGroups, type NavGroup, type NavItem } from './sidebar-nav-items';

/**
 * Main application sidebar with club navigation.
 * Features:
 * - Club header with avatar and name
 * - Navigation groups with coming-soon state
 * - Settings link
 * - User footer with dropdown menu (theme toggle, sign out)
 * - Collapsible to icon mode via SidebarRail
 */
export function AppSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const { state: sidebarState } = useSidebar();
  const activeClub = useActiveClub();
  const { data: clubsData } = useMyClubsQuery();
  const [showClubSwitcher, setShowClubSwitcher] = useState(false);

  const slug = (params?.slug as string) || activeClub?.slug || '';
  const navGroups = getClubNavGroups(slug);
  const clubs = clubsData?.clubs ?? [];
  const canCreateClub = clubsData?.canCreateClub ?? false;
  const hasMultipleClubs = clubs.length >= 2;
  const isCollapsed = sidebarState === 'collapsed';

  return (
    <>
      <Sidebar collapsible="icon">
        {/* Club Header */}
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              {hasMultipleClubs ? (
                <SidebarMenuButton
                  size="lg"
                  onClick={() => setShowClubSwitcher(true)}
                  className="cursor-pointer"
                >
                  <ClubAvatar club={activeClub ?? undefined} size="sm" className="shrink-0" />
                  <div className="flex flex-1 flex-col gap-0.5 leading-none overflow-hidden">
                    <span className="font-semibold truncate">
                      {activeClub?.name ?? 'Verein wählen'}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 shrink-0" />
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton size="lg" asChild>
                  <Link href={`/clubs/${slug}/dashboard`}>
                    <ClubAvatar club={activeClub ?? undefined} size="sm" className="shrink-0" />
                    <div className="flex flex-1 flex-col gap-0.5 leading-none overflow-hidden">
                      <span className="font-semibold truncate">{activeClub?.name ?? 'Verein'}</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* Navigation Content */}
        <SidebarContent>
          {navGroups.map((group, groupIndex) => (
            <NavGroupSection
              key={group.label ?? `group-${groupIndex}`}
              group={group}
              pathname={pathname}
              isCollapsed={isCollapsed}
            />
          ))}
        </SidebarContent>

        {/* User Footer */}
        <SidebarUserMenu>
          <ChevronsUpDown className="ml-auto size-4" />
        </SidebarUserMenu>

        <SidebarRail />
      </Sidebar>

      <ClubSwitcherModal
        open={showClubSwitcher}
        onOpenChange={setShowClubSwitcher}
        canCreateClub={canCreateClub}
      />
    </>
  );
}

/**
 * Renders a single navigation group with optional label.
 */
function NavGroupSection({
  group,
  pathname,
  isCollapsed,
}: {
  group: NavGroup;
  pathname: string;
  isCollapsed: boolean;
}) {
  return (
    <SidebarGroup>
      {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {group.items.map((item) => (
            <NavItemButton
              key={item.url}
              item={item}
              pathname={pathname}
              isCollapsed={isCollapsed}
            />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

/**
 * Renders a single navigation item.
 * Coming-soon items are shown with reduced opacity and a tooltip.
 */
function NavItemButton({
  item,
  pathname,
  isCollapsed,
}: {
  item: NavItem;
  pathname: string;
  isCollapsed: boolean;
}) {
  const isActive = pathname === item.url || pathname.startsWith(`${item.url}/`);

  if (item.comingSoon) {
    return (
      <SidebarMenuItem>
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarMenuButton
              className={cn('opacity-50 cursor-default pointer-events-auto')}
              disabled
            >
              <item.icon className="size-4" />
              <span>{item.title}</span>
            </SidebarMenuButton>
          </TooltipTrigger>
          <TooltipContent side={isCollapsed ? 'right' : 'bottom'}>
            <p>Bald verfügbar</p>
          </TooltipContent>
        </Tooltip>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link href={item.url}>
          <item.icon className="size-4" />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
