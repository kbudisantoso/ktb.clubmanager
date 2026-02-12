'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { ArrowLeft, LogOut, Moon, Shield, Sun, User } from 'lucide-react';

import { useSessionQuery, useClearSession } from '@/hooks/use-session';
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';

import { getAdminNavGroups } from './sidebar-nav-items';

/**
 * Admin sidebar for the Verwaltungszentrale (Super Admin area).
 * Features:
 * - Shield icon + "Verwaltungszentrale" header
 * - Navigation from getAdminNavGroups()
 * - "Zurück zur App" link
 * - User footer with dropdown (theme toggle, sign out)
 * - Collapsible to icon mode via SidebarRail
 */
export function AdminSidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { data: session } = useSessionQuery();
  const clearSession = useClearSession();

  const navGroups = getAdminNavGroups();

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
      {/* Verwaltungszentrale Header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/admin">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                  <Shield className="size-4" />
                </div>
                <div className="flex flex-1 flex-col gap-0.5 leading-none overflow-hidden">
                  <span className="font-semibold truncate">Verwaltungszentrale</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation Content */}
      <SidebarContent>
        {navGroups.map((group, groupIndex) => (
          <SidebarGroup key={group.label ?? `group-${groupIndex}`}>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive =
                    item.url === '/admin'
                      ? pathname === '/admin'
                      : pathname === item.url || pathname.startsWith(`${item.url}/`);
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.url}>
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
        ))}

        {/* Back to App link */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard">
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
