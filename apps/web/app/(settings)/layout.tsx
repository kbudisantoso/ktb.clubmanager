import { AppShell } from '@/components/layout/app-shell';
import { SettingsSidebar } from '@/components/layout/settings-sidebar';
import { ClubSync } from '@/components/providers/club-sync';

export default function PersonalSettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ClubSync />
      <AppShell sidebar={<SettingsSidebar />}>{children}</AppShell>
    </>
  );
}
