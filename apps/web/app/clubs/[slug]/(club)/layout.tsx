import { AppShell } from '@/components/layout/app-shell';
import { AppSidebar } from '@/components/layout/app-sidebar';

export default function ClubMainLayout({ children }: { children: React.ReactNode }) {
  return <AppShell sidebar={<AppSidebar />}>{children}</AppShell>;
}
