import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Server-side super admin access check.
 * Use in server components to verify user is a super admin.
 *
 * Returns the userId if access is granted, otherwise:
 * - Redirects to login if not authenticated
 * - Throws notFound() if not a super admin (security: doesn't reveal admin area exists)
 *
 * @example
 * ```tsx
 * // In a server component
 * export default async function AdminPage() {
 *   await checkSuperAdmin();
 *   // User is authenticated and is a super admin
 * }
 * ```
 */
export async function checkSuperAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/login?callbackUrl=/admin');
  }

  // Better Auth session doesn't include isSuperAdmin,
  // so we need to check the database directly
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isSuperAdmin: true },
  });

  if (!user?.isSuperAdmin) {
    // Security: Don't reveal that an admin area exists
    notFound();
  }

  return { userId: session.user.id };
}
