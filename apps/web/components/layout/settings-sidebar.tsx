'use client';

import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  ArrowLeft,
  Bell,
  Building2,
  Hash,
  Key,
  LogOut,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  User,
  Users,
} from 'lucide-react';

import { useActiveClub } from '@/lib/club-store';
import { useSessionQuery, useClearSession } from '@/hooks/use-session';
import { useCanManageSettings } from '@/lib/club-permissions';
import { authClient } from '@/lib/auth-client';
import { getAuthBroadcast } from '@/lib/broadcast-auth';
import { cn } from '@/lib/utils';
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
} from '@/components/ui/sidebar';

/**
 * Settings sidebar — replaces the main AppSidebar when inside settings.
 *
 * Header: Always Settings icon + "Einstellungen" (unified look).
 *
 * Navigation:
 * - "Persönlich" group: Profil, Meine Vereine, Benachrichtigungen
 * - Club group (if activeClub + canManageSettings): Allgemein, Benutzer, Einladungen, Nummernkreise
 *
 * The club section uses activeClub from Zustand (not URL slug), so it
 * appears in both personal and club settings contexts.
 *
 * Footer:
 * - "Zurück zur App" link (goes to club dashboard or main dashboard)
 * - User dropdown (theme toggle, sign out)
 */
export function SettingsSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const activeClub = useActiveClub();
  const { data: session } = useSessionQuery();
  const clearSession = useClearSession();
  const canManageSettings = useCanManageSettings();

  // Use slug from URL if available, fall back to activeClub from store
  const slug = (params?.slug as string) || activeClub?.slug || '';
  const clubBasePath = slug ? `/clubs/${slug}/settings` : '';
  const backHref = slug ? `/clubs/${slug}/dashboard` : '/dashboard';

  // Personal settings nav items
  const personalItems = [
    { href: '/settings/profile', title: 'Profil', icon: User },
    { href: '/settings/my-clubs', title: 'Meine Vereine', icon: Building2 },
    { href: '/settings/notifications', title: 'Benachrichtigungen', icon: Bell },
  ];

  // Club settings nav items (only when we have a club context)
  const clubItems =
    clubBasePath && canManageSettings
      ? [
          { href: clubBasePath, title: 'Allgemein', icon: Settings },
          { href: `${clubBasePath}/users`, title: 'Benutzer', icon: Users },
          { href: `${clubBasePath}/invites`, title: 'Einladungen', icon: Key },
          { href: `${clubBasePath}/number-ranges`, title: 'Nummernkreise', icon: Hash },
        ]
      : [];

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
    <Sidebar collapsible="icon">
      {/* Header — always Settings icon + "Einstellungen" */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/settings">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                  <Settings className="size-4" />
                </div>
                <div className="flex flex-1 flex-col gap-0.5 leading-none overflow-hidden">
                  <span className="font-semibold truncate">Einstellungen</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation Content */}
      <SidebarContent>
        {/* Personal settings group */}
        <SidebarGroup>
          <SidebarGroupLabel>Persönlich</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {personalItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href === '/settings/profile' && pathname === '/settings');
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Club settings group */}
        {clubItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="truncate" title={activeClub?.name}>
              {activeClub?.name ?? 'Verein'}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {clubItems.map((item) => {
                  const isActive =
                    item.href === clubBasePath
                      ? pathname === clubBasePath
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.href}>
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Back to App link */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href={backHref}>
                    <ArrowLeft className="size-4" />
                    <span>Zurück zur App</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User Footer */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className={cn(
                    'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
                  )}
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
                      <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                {user?.isSuperAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => router.push('/admin')}
                      className="cursor-pointer"
                    >
                      <ShieldCheck className="mr-2 size-4" />
                      <span>Verwaltungszentrale</span>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
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
  );
}
