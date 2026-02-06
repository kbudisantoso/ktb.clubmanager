"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldAlert } from "lucide-react"

interface AccessDeniedProps {
  /**
   * The name of the feature/page the user tried to access
   */
  feature?: string
  /**
   * Custom description (defaults to standard German message)
   */
  description?: string
  /**
   * Back button href
   */
  backHref?: string
  /**
   * Back button label
   */
  backLabel?: string
}

/**
 * Inline "Access Denied" component for when user has club access
 * but lacks permission for a specific feature/page.
 *
 * Shows a friendly message suggesting they contact an admin.
 */
export function AccessDenied({
  feature,
  description,
  backHref = "/dashboard",
  backLabel = "Zurück zum Dashboard",
}: AccessDeniedProps) {
  const defaultDescription = feature
    ? `Du hast keine Berechtigung, ${feature} zu sehen. Bitte wende dich an einen Administrator.`
    : "Du hast keine Berechtigung für diese Seite. Bitte wende dich an einen Administrator."

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle>Keine Berechtigung</CardTitle>
          <CardDescription className="text-base">
            {description || defaultDescription}
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
