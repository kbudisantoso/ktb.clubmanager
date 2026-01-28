import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

// Force dynamic rendering - this page requires authentication
export const dynamic = "force-dynamic"

export const metadata = {
  title: "Dashboard | ClubManager",
  description: "Dein Vereins-Dashboard",
}

export default async function DashboardPage() {
  // Get session from Better Auth
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  // Middleware should handle this, but double-check
  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">
          Willkommen{session.user.name ? `, ${session.user.name}` : ""}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Dies ist dein persönliches Dashboard.
        </p>
      </div>

      {/* Empty state - no clubs assigned yet */}
      <div className="rounded-lg border bg-card p-8 text-center">
        <div className="mx-auto max-w-md">
          <h2 className="text-xl font-semibold mb-2">Kein Verein zugewiesen</h2>
          <p className="text-muted-foreground mb-4">
            Du bist noch keinem Verein zugeordnet. Warte auf eine
            Einladung oder fordere Zugang an.
          </p>
          <p className="text-sm text-muted-foreground">
            Eingeloggt als: {session.user.email}
          </p>
        </div>
      </div>
    </div>
  )
}
