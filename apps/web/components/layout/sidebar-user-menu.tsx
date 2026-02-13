'use client';

import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { LogOut, Moon, Settings, ShieldCheck, Sun, User } from 'lucide-react';

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
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

/**
 * Shared user menu footer for all sidebars (AppSidebar, AdminSidebar, SettingsSidebar).
 *
 * Displays:
 * - User avatar + name/email as trigger
 * - Verwaltungszentrale (Super Admin only)
 * - Vereins-Einstellungen (if canManageSettings + active club)
 * - Mein Profil
 * - Theme toggle
 * - Abmelden
 *
 * Single source of truth — changes here apply to all sidebars.
 */
export function SidebarUserMenu({ children }: { children?: React.ReactNode }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const activeClub = useActiveClub();
  const { data: session } = useSessionQuery();
  const clearSession = useClearSession();
  const canManageSettings = useCanManageSettings();

  const slug = activeClub?.slug || '';
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
                {children}
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
              {/* Admin & Club Settings */}
              {(user?.isSuperAdmin || (canManageSettings && slug)) && (
                <>
                  <DropdownMenuSeparator />
                  {user?.isSuperAdmin && (
                    <DropdownMenuItem
                      onClick={() => router.push('/admin')}
                      className="cursor-pointer"
                    >
                      <ShieldCheck className="mr-2 size-4" />
                      <span>Verwaltungszentrale</span>
                    </DropdownMenuItem>
                  )}
                  {canManageSettings && slug && (
                    <DropdownMenuItem
                      onClick={() => router.push(`/clubs/${slug}/settings`)}
                      className="cursor-pointer"
                    >
                      <Settings className="mr-2 size-4" />
                      <span>Vereins-Einstellungen</span>
                    </DropdownMenuItem>
                  )}
                </>
              )}
              {/* Personal */}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer">
                <User className="mr-2 size-4" />
                <span>Mein Profil</span>
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
  );
}
