"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileQuestion } from "lucide-react"

interface PageNotFoundProps {
  backHref?: string
  backLabel?: string
}

/**
 * Generic "page not found" component for when user has access
 * but navigated to a non-existent page within their accessible area.
 */
export function PageNotFound({
  backHref = "/dashboard",
  backLabel = "Zurück zum Dashboard"
}: PageNotFoundProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle>Seite nicht gefunden</CardTitle>
          <CardDescription>
            Die angeforderte Seite existiert nicht.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={backHref}>{backLabel}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
