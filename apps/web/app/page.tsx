'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionQuery } from '@/hooks/use-session';
import { Loader2 } from 'lucide-react';

/**
 * Root page - redirects authenticated users to dashboard,
 * unauthenticated users to login.
 */
export default function Home() {
  const router = useRouter();
  const { data: session, isLoading: isPending } = useSessionQuery();

  useEffect(() => {
    if (isPending) return;

    if (session?.user) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [session, isPending, router]);

  // Show loading state while checking auth
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="mt-4 text-muted-foreground">Laden...</p>
    </main>
  );
}
