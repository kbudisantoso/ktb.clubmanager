'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { ChevronsUpDown, LogOut, Moon, Settings, Sun, User } from 'lucide-react';

import { useActiveClub } from '@/lib/club-store';
import { useSessionQuery, useClearSession } from '@/hooks/use-session';
import { useMyClubsQuery } from '@/hooks/use-clubs';
import { useCanManageSettings } from '@/lib/club-permissions';
import { authClient } from '@/lib/auth-client';
import { getAuthBroadcast } from '@/lib/broadcast-auth';
import { cn } from '@/lib/utils';
import { ClubAvatar } from '@/components/club-switcher/club-avatar';
import { ClubSwitcherModal } from '@/components/club-switcher/club-switcher-modal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { state: sidebarState } = useSidebar();
  const activeClub = useActiveClub();
  const { data: session } = useSessionQuery();
  const { data: clubsData } = useMyClubsQuery();
  const clearSession = useClearSession();
  const canManageSettings = useCanManageSettings();
  const [showClubSwitcher, setShowClubSwitcher] = useState(false);

  const slug = (params?.slug as string) ?? '';
  const navGroups = getClubNavGroups(slug);
  const clubs = clubsData?.clubs ?? [];
  const canCreateClub = clubsData?.canCreateClub ?? false;
  const hasMultipleClubs = clubs.length >= 2;
  const isCollapsed = sidebarState === 'collapsed';

  const user = session?.user;
  const userInitials = user?.name
    ? (() => {
        const words = user.name.split(' ').filter(Boolean);
        if (words.length >= 2) {
          return (words[0][0] + words[words.length - 1][0]).toUpperCase();
        }
        return words[0]?.[0]?.toUpperCase() ?? '';
      })()
    : null;

  const handleSignOut = async () => {
    const authBroadcast = getAuthBroadcast();
    authBroadcast.notifyLogout();
    authBroadcast.clearAuthState();
    clearSession();
    await authClient.signOut();
    window.location.href = '/login?signedOut=true';
  };

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

          {/* Settings link at bottom of navigation */}
          {canManageSettings && (
            <SidebarGroup className="mt-auto">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith(`/clubs/${slug}/settings`)}
                    >
                      <Link href={`/clubs/${slug}/settings`}>
                        <Settings className="size-4" />
                        <span>Einstellungen</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        {/* User Footer */}
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="size-8 rounded-lg">
                      <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? 'Avatar'} />
                      <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-sm">
                        {userInitials ?? <User className="size-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight overflow-hidden">
                      <span className="truncate font-semibold">{user?.name ?? 'Benutzer'}</span>
                      <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                  side="top"
                  align="start"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="size-8 rounded-lg">
                        <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? 'Avatar'} />
                        <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-sm">
                          {userInitials ?? <User className="size-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">{user?.name ?? 'Benutzer'}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {user?.email}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => router.push('/settings')}
                    className="cursor-pointer"
                  >
                    <Settings className="mr-2 size-4" />
                    <span>Einstellungen</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="cursor-pointer"
                  >
                    {theme === 'dark' ? (
                      <Sun className="mr-2 size-4" />
                    ) : (
                      <Moon className="mr-2 size-4" />
                    )}
                    <span>{theme === 'dark' ? 'Hell' : 'Dunkel'}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer"
                    variant="destructive"
                  >
                    <LogOut className="mr-2 size-4" />
                    <span>Abmelden</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

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
