'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Shield } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';

import { getAdminNavGroups } from './sidebar-nav-items';
import { SidebarUserMenu } from './sidebar-user-menu';

/**
 * Admin sidebar for the Verwaltungszentrale (Super Admin area).
 * Features:
 * - Shield icon + "Verwaltungszentrale" header
 * - Navigation from getAdminNavGroups()
 * - "Zurück zur App" link
 * - Shared user footer via SidebarUserMenu
 * - Collapsible to icon mode via SidebarRail
 */
export function AdminSidebar() {
  const pathname = usePathname();

  const navGroups = getAdminNavGroups();

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
      <SidebarUserMenu />

      <SidebarRail />
    </Sidebar>
  );
}
