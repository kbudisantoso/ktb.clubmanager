'use client';

import { AppShell } from '@/components/layout/app-shell';
import { SettingsSidebar } from '@/components/layout/settings-sidebar';
import { useClubDeactivationBanner } from '../_layout-client';

export default function ClubSettingsLayout({ children }: { children: React.ReactNode }) {
  const banner = useClubDeactivationBanner();
  return (
    <AppShell sidebar={<SettingsSidebar />} banner={banner}>
      {children}
    </AppShell>
  );
}
