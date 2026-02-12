import { AppShell } from '@/components/layout/app-shell';
import { SettingsSidebar } from '@/components/layout/settings-sidebar';

export default function ClubSettingsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell sidebar={<SettingsSidebar />}>{children}</AppShell>;
}
