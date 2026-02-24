'use client';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MobileBottomBar } from './mobile-bottom-bar';
import { useSidebarStore } from '@/lib/sidebar-store';

interface AppShellProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  banner?: React.ReactNode;
}

/**
 * Centralized layout shell that wraps the sidebar and content area.
 *
 * The sidebar is passed as a prop (AppSidebar for club pages, AdminSidebar
 * for the Kommandozentrale) to keep AppShell reusable across contexts.
 *
 * Uses Zustand for sidebar open/closed persistence instead of cookies
 * to avoid Next.js 16 cookie-based SidebarProvider issues.
 */
export function AppShell({ children, sidebar, banner }: AppShellProps) {
  const { isOpen, setOpen } = useSidebarStore();

  return (
    <SidebarProvider open={isOpen} onOpenChange={setOpen}>
      {sidebar}
      <SidebarInset>
        {banner}
        <div className="flex flex-1 flex-col pb-16 md:pb-0">{children}</div>
      </SidebarInset>
      <MobileBottomBar />
    </SidebarProvider>
  );
}
