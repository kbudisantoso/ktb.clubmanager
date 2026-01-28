import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-display font-bold">404</h1>
        <p className="text-muted-foreground">Seite nicht gefunden</p>
        <Link
          href="/"
          className="inline-block text-primary hover:underline"
        >
          Zur Startseite
        </Link>
      </div>
    </div>
  )
}
