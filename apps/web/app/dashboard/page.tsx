import { auth } from "@/auth"
import { redirect } from "next/navigation"

export const metadata = {
  title: "Dashboard | ktb.clubmanager",
  description: "Ihr Vereins-Dashboard",
}

export default async function DashboardPage() {
  const session = await auth()

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
          Dies ist Ihr persoenliches Dashboard.
        </p>
      </div>

      {/* Empty state - no clubs assigned yet */}
      <div className="rounded-lg border bg-card p-8 text-center">
        <div className="mx-auto max-w-md">
          <h2 className="text-xl font-semibold mb-2">Kein Verein zugewiesen</h2>
          <p className="text-muted-foreground mb-4">
            Sie sind noch keinem Verein zugeordnet. Warten Sie auf eine
            Einladung oder fordern Sie Zugang an.
          </p>
          <p className="text-sm text-muted-foreground">
            Eingeloggt als: {session.user.email}
          </p>
        </div>
      </div>
    </div>
  )
}
