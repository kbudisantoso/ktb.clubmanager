import { checkSuperAdmin } from '@/lib/check-super-admin';
import { AppShell } from '@/components/layout/app-shell';
import { AdminSidebar } from '@/components/layout/admin-sidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await checkSuperAdmin();

  return (
    <AppShell sidebar={<AdminSidebar />}>
      <div className="p-6">{children}</div>
    </AppShell>
  );
}
