import { redirect } from "next/navigation"
import { checkClubAccess } from "@/lib/check-club-access"

interface ClubPageProps {
  params: Promise<{ slug: string }>
}

/**
 * Redirect /clubs/:slug to /clubs/:slug/dashboard
 *
 * This page:
 * 1. Checks server-side if user has access to the club
 * 2. Returns proper 404 status if no access (security: ambiguous message)
 * 3. Redirects to dashboard if access is granted
 */
export default async function ClubPage({ params }: ClubPageProps) {
  const { slug } = await params

  // Server-side access check - throws notFound() with proper 404 status if no access
  await checkClubAccess(slug)

  redirect(`/clubs/${slug}/dashboard`)
}
