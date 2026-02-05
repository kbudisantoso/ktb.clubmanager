import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        Die angeforderte Seite existiert nicht oder du hast keinen Zugriff.
      </p>
      <div className="flex gap-4">
        <Button asChild variant="outline">
          <Link href="/">Zur Startseite</Link>
        </Button>
        <Button asChild>
          <Link href="/clubs">Meine Vereine</Link>
        </Button>
      </div>
    </div>
  )
}
