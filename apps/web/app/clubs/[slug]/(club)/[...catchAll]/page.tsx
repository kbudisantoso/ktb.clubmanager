import { checkClubAccess } from '@/lib/check-club-access';
import { PageNotFound } from '@/components/page-not-found';

interface CatchAllPageProps {
  params: Promise<{ slug: string; catchAll: string[] }>;
}

/**
 * Catch-all route for undefined paths under /clubs/[slug]/.
 *
 * This ensures:
 * 1. Club access is checked first (returns 404 if no access)
 * 2. If access is granted but path doesn't exist, shows "page not found"
 *
 * Two different messages:
 * - No access: "Verein nicht gefunden oder kein Zugriff" (security)
 * - Has access, page missing: "Seite nicht gefunden" (regular 404)
 */
export default async function CatchAllPage({ params }: CatchAllPageProps) {
  const { slug } = await params;

  // Check club access first - will return 404 with security message if no access
  await checkClubAccess(slug);

  // If we get here, user has access but path doesn't exist
  // Show regular "page not found" message (not security message)
  return <PageNotFound backHref={`/clubs/${slug}/dashboard`} backLabel="Zurück zum Verein" />;
}
