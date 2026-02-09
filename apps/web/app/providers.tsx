'use client';

import { useState, useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Toaster } from '@/components/ui/sonner';
import { getAuthBroadcast } from '@/lib/broadcast-auth';
import { sanitizeCallbackUrl } from '@/lib/url-validation';

/**
 * AuthSyncProvider handles cross-tab authentication synchronization.
 * Listens for LOGOUT events from other tabs and redirects to login.
 * Listens for LOGIN events to redirect login page to dashboard.
 */
function AuthSyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const authBroadcast = getAuthBroadcast();

    // Handle logout from other tabs
    authBroadcast.on('LOGOUT', () => {
      // Clear local auth state
      authBroadcast.clearAuthState();
      // Redirect to login with signedOut parameter
      window.location.href = '/login?signedOut=true';
    });

    // Handle login from other tabs (for login page)
    authBroadcast.on('LOGIN', () => {
      // If we're on the login page, redirect to dashboard
      if (window.location.pathname === '/login') {
        const returnUrl = sanitizeCallbackUrl(sessionStorage.getItem('ktb.returnUrl'));
        window.location.href = returnUrl;
      }
    });

    return () => {
      authBroadcast.disconnect();
    };
  }, []);

  return <>{children}</>;
}

/**
 * Root providers component that wraps the application.
 * Includes ThemeProvider for dark/light mode support.
 * Includes NuqsAdapter for type-safe URL search param state management.
 * Includes AuthSyncProvider for cross-tab authentication sync.
 * Includes QueryClientProvider for server state management.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient once per client instance
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Consider data fresh for 30 seconds
            staleTime: 30 * 1000,
            // Keep unused data in cache for 5 minutes
            gcTime: 5 * 60 * 1000,
            // Retry failed requests once
            retry: 1,
            // Don't refetch on window focus in development
            refetchOnWindowFocus: process.env.NODE_ENV === 'production',
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <NuqsAdapter>
          <AuthSyncProvider>
            {children}
            <Toaster richColors />
          </AuthSyncProvider>
        </NuqsAdapter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
