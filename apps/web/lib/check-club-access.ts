import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * Server-side club access check.
 * Use in server components to verify user has access to a club.
 *
 * Returns the club if access is granted, otherwise:
 * - Redirects to login if not authenticated
 * - Throws notFound() if no access (security: doesn't reveal if club exists)
 *
 * @example
 * ```tsx
 * // In a server component
 * export default async function ClubPage({ params }: Props) {
 *   const club = await checkClubAccess(params.slug)
 *   // User has access, club is guaranteed to exist
 * }
 * ```
 */
export async function checkClubAccess(slug: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect(`/login?callbackUrl=/clubs/${slug}/dashboard`)
  }

  // Check if user has access to this club
  const clubUser = await prisma.clubUser.findFirst({
    where: {
      userId: session.user.id,
      club: {
        slug,
        deletedAt: null,
      },
      status: "ACTIVE",
    },
    include: {
      club: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  })

  if (!clubUser) {
    // Security: Don't reveal if club exists or user lacks access
    notFound()
  }

  return {
    club: clubUser.club,
    roles: clubUser.roles,
    userId: session.user.id,
  }
}
