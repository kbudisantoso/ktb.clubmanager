"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldX } from "lucide-react"

/**
 * Security-conscious 404 page for clubs.
 * Shows ambiguous message that doesn't reveal whether club exists or user lacks access.
 * This prevents information leakage to potential attackers.
 */
export function ClubNotFound() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <ShieldX className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle>Verein nicht gefunden</CardTitle>
          <CardDescription>
            Der Verein existiert nicht oder du hast keinen Zugriff.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard">Zurück zum Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
