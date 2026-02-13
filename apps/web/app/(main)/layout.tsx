import { AppShell } from '@/components/layout/app-shell';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { ClubSync } from '@/components/providers/club-sync';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ClubSync />
      <AppShell sidebar={<AppSidebar />}>{children}</AppShell>
    </>
  );
}
