'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionQuery } from '@/hooks/use-session';
import { apiFetch } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { AdminSidebar } from '@/components/layout/admin-sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isLoading: sessionLoading } = useSessionQuery();

  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);

  // Check Super Admin status
  useEffect(() => {
    if (sessionLoading) return;

    if (!session?.user) {
      router.push('/login?callbackUrl=/admin');
      return;
    }

    checkSuperAdmin();
  }, [session, sessionLoading, router]);

  async function checkSuperAdmin() {
    try {
      const res = await apiFetch('/api/users/me');
      if (res.ok) {
        const user = await res.json();
        if (user.isSuperAdmin) {
          setIsSuperAdmin(true);
        } else {
          setIsSuperAdmin(false);
          router.push('/dashboard');
        }
      } else {
        router.push('/login?callbackUrl=/admin');
      }
    } catch {
      router.push('/dashboard');
    }
  }

  if (sessionLoading || isSuperAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isSuperAdmin === false) {
    return null; // Will redirect
  }

  return (
    <AppShell sidebar={<AdminSidebar />}>
      <div className="p-6">{children}</div>
    </AppShell>
  );
}
