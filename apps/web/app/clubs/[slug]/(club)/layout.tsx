'use client';

import { AppShell } from '@/components/layout/app-shell';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { useClubDeactivationBanner } from '../_layout-client';

export default function ClubMainLayout({ children }: { children: React.ReactNode }) {
  const banner = useClubDeactivationBanner();
  return (
    <AppShell sidebar={<AppSidebar />} banner={banner}>
      {children}
    </AppShell>
  );
}
