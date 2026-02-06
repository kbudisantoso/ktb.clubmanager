import { checkClubAccess } from "@/lib/check-club-access"
import { ClubDashboardClient } from "./_client"

interface DashboardPageProps {
  params: Promise<{ slug: string }>
}

/**
 * Club dashboard page with server-side access check.
 * Returns proper 404 status if user doesn't have access.
 */
export default async function ClubDashboardPage({ params }: DashboardPageProps) {
  const { slug } = await params

  // Server-side access check - throws notFound() with proper 404 status
  await checkClubAccess(slug)

  return <ClubDashboardClient />
}
