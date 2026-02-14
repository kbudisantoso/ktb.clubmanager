'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { ArrowLeft, Bell, Building2, Hash, Key, Settings, Shield, User, Users } from 'lucide-react';

import { useActiveClub } from '@/lib/club-store';
import { useCanManageSettings } from '@/lib/club-permissions';
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
} from '@/components/ui/sidebar';

import { SidebarUserMenu } from './sidebar-user-menu';

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
 * - Shared user dropdown via SidebarUserMenu
 */
export function SettingsSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const activeClub = useActiveClub();
  const canManageSettings = useCanManageSettings();

  // Use slug from URL if available, fall back to activeClub from store
  const slug = (params?.slug as string) || activeClub?.slug || '';
  const clubBasePath = slug ? `/clubs/${slug}/settings` : '';
  const backHref = slug ? `/clubs/${slug}/dashboard` : '/dashboard';

  // Personal settings nav items
  const personalItems = [
    { href: '/settings/profile', title: 'Profil', icon: User },
    { href: '/settings/security', title: 'Sicherheit', icon: Shield },
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
      <SidebarUserMenu />

      <SidebarRail />
    </Sidebar>
  );
}
