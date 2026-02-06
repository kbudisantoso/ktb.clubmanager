import { redirect } from "next/navigation"

interface ClubRedirectProps {
  params: Promise<{ slug: string }>
}

/**
 * Redirect /club/:slug to /clubs/:slug/dashboard
 * Handles common typo of singular "club" instead of "clubs".
 */
export default async function ClubRedirectPage({ params }: ClubRedirectProps) {
  const { slug } = await params
  redirect(`/clubs/${slug}/dashboard`)
}
