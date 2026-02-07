'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface AccessDeniedRedirectProps {
  /**
   * Where to redirect:
   * - 'clubs' -> /clubs (no club access)
   * - 'dashboard' -> /clubs/{slug} (no permission for specific feature)
   */
  type: 'clubs' | 'dashboard';
  /**
   * Club slug for dashboard redirect
   */
  clubSlug?: string;
  /**
   * Custom error message (defaults to standard German messages)
   */
  message?: string;
}

/**
 * Component that redirects user and shows toast on access denial.
 * Use in page components when detecting authorization failure.
 *
 * @example
 * ```tsx
 * if (!hasPermission) {
 *   return <AccessDeniedRedirect type="dashboard" clubSlug={params.slug} />
 * }
 * ```
 */
export function AccessDeniedRedirect({ type, clubSlug, message }: AccessDeniedRedirectProps) {
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const toastMessage =
      message ||
      (type === 'clubs'
        ? 'Du hast keinen Zugang zu diesem Verein'
        : 'Du hast keine Berechtigung für diese Aktion');

    toast({
      title: 'Zugriff verweigert',
      description: toastMessage,
      variant: 'destructive',
    });

    const redirectUrl = type === 'clubs' ? '/clubs' : clubSlug ? `/clubs/${clubSlug}` : '/clubs';

    router.replace(redirectUrl);
  }, [type, clubSlug, message, router, toast]);

  // Return null - redirect happens in useEffect
  return null;
}

/**
 * Helper hook for programmatic access denial handling.
 */
export function useAccessDenied() {
  const router = useRouter();
  const { toast } = useToast();

  return {
    redirectToClubs: (message?: string) => {
      toast({
        title: 'Zugriff verweigert',
        description: message || 'Du hast keinen Zugang zu diesem Verein',
        variant: 'destructive',
      });
      router.replace('/clubs');
    },
    redirectToDashboard: (clubSlug: string, message?: string) => {
      toast({
        title: 'Zugriff verweigert',
        description: message || 'Du hast keine Berechtigung für diese Aktion',
        variant: 'destructive',
      });
      router.replace(`/clubs/${clubSlug}`);
    },
  };
}
