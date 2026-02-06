import { checkClubAccess } from "@/lib/check-club-access"
import { UsersSettingsClient } from "./_client"

interface UsersPageProps {
  params: Promise<{ slug: string }>
}

/**
 * User management settings page with server-side access check.
 * Returns proper 404 status if user doesn't have access.
 */
export default async function UsersSettingsPage({ params }: UsersPageProps) {
  const { slug } = await params

  // Server-side access check - throws notFound() with proper 404 status
  await checkClubAccess(slug)

  return <UsersSettingsClient />
}
