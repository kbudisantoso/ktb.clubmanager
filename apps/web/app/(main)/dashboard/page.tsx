import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Users, BookOpen, CreditCard, Plus, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"

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

  // TODO: Fetch actual club data when available
  const hasClubs = false

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="gradient-text">
          Willkommen{session.user.name ? `, ${session.user.name}` : ""}!
        </h1>
        <p>Dies ist dein persönliches Dashboard.</p>
      </div>

      {hasClubs ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="app-card stat-card">
              <div className="stat-value">0</div>
              <div className="stat-label">Mitglieder</div>
            </div>
            <div className="app-card stat-card">
              <div className="stat-value">0</div>
              <div className="stat-label">Offene Buchungen</div>
            </div>
            <div className="app-card stat-card">
              <div className="stat-value">0 €</div>
              <div className="stat-label">Kontostand</div>
            </div>
            <div className="app-card stat-card">
              <div className="stat-value">0</div>
              <div className="stat-label">Anstehende Termine</div>
            </div>
          </div>

          {/* Quick Actions */}
          <h2 className="text-lg font-semibold mb-4">Schnellzugriff</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="quick-action">
              <div className="quick-action-icon">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium">Mitglieder</div>
                <div className="text-sm text-muted-foreground">Verwalten & hinzufügen</div>
              </div>
            </div>
            <div className="quick-action">
              <div className="quick-action-icon">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium">Buchhaltung</div>
                <div className="text-sm text-muted-foreground">Buchungen erfassen</div>
              </div>
            </div>
            <div className="quick-action">
              <div className="quick-action-icon">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium">SEPA-Lastschriften</div>
                <div className="text-sm text-muted-foreground">Beiträge einziehen</div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Empty State - No clubs assigned */
        <div className="app-card">
          <div className="empty-state">
            <div className="empty-icon">
              <Building2 className="h-8 w-8" />
            </div>
            <h2>Kein Verein zugewiesen</h2>
            <p className="mb-6">
              Du bist noch keinem Verein zugeordnet. Warte auf eine
              Einladung oder erstelle einen neuen Verein.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button className="glow-primary">
                <Plus className="h-4 w-4 mr-2" />
                Verein erstellen
              </Button>
              <Button variant="outline">
                Einladungscode eingeben
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              Eingeloggt als: {session.user.email}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
