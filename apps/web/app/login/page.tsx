"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GoogleIcon } from "@/components/icons"
import { authClient } from "@/lib/auth-client"
import { getAuthBroadcast } from "@/lib/broadcast-auth"
import { ArrowLeft, Loader2 } from "lucide-react"

type LoginStep = "email" | "auth-options"

function LoginContent() {
  const searchParams = useSearchParams()
  const signedOut = searchParams.get("signedOut") === "true"
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"

  const [step, setStep] = useState<LoginStep>("email")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if Google OAuth is enabled (client-side check via env var)
  const googleEnabled = !!process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError("Bitte gib deine E-Mail-Adresse ein")
      return
    }
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Bitte gib eine gültige E-Mail-Adresse ein")
      return
    }
    setError(null)
    setStep("auth-options")
  }

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: signInError } = await authClient.signIn.email({
        email,
        password,
      })

      if (signInError) {
        setError("E-Mail oder Passwort ist falsch")
        setIsLoading(false)
        return
      }

      if (data) {
        // Notify other tabs
        getAuthBroadcast().notifyLogin()
        // Redirect to callback URL
        window.location.href = callbackUrl
      }
    } catch {
      setError("Ein Fehler ist aufgetreten. Bitte versuche es erneut.")
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError(null)

    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: callbackUrl,
      })
    } catch {
      setError("Ein Fehler ist aufgetreten. Bitte versuche es erneut.")
      setIsLoading(false)
    }
  }

  const goBack = () => {
    setStep("email")
    setPassword("")
    setError(null)
  }

  return (
    <div className="flex min-h-screen">
      {/* Left: Brand visual - hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary/80 items-center justify-center p-12">
        <div className="max-w-md text-primary-foreground">
          <Image
            src="/logo-darkbg.png"
            alt="ClubManager"
            width={280}
            height={70}
            className="h-14 w-auto mb-4"
            priority
          />
          <p className="text-lg opacity-90">
            Moderne Vereinsverwaltung mit integrierter Buchhaltung
          </p>
          <ul className="mt-8 space-y-3 opacity-80">
            <li className="flex items-center gap-2">
              <CheckIcon className="h-5 w-5" />
              <span>Mitgliederverwaltung</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon className="h-5 w-5" />
              <span>Doppelte Buchführung (SKR42)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon className="h-5 w-5" />
              <span>SEPA-Lastschriften</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Right: Login form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile-only logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Image
              src="/logo.png"
              alt="ClubManager"
              width={200}
              height={50}
              className="h-10 w-auto"
              priority
            />
          </div>

          {step === "email" ? (
            /* Step 1: Email input */
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-display font-bold">Anmelden</h2>
                <p className="text-muted-foreground mt-2">
                  Gib deine E-Mail-Adresse ein
                </p>
              </div>

              {signedOut && (
                <div className="rounded-md bg-success/10 border border-success/20 p-3 text-sm text-success">
                  Du wurdest erfolgreich abgemeldet.
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail-Adresse</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.de"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Weiter
                </Button>
              </form>

              {googleEnabled && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        oder
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                  >
                    <GoogleIcon className="mr-2 h-5 w-5" />
                    Mit Google anmelden
                  </Button>
                </>
              )}
            </div>
          ) : (
            /* Step 2: Password input */
            <div className="space-y-6">
              <button
                onClick={goBack}
                className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                {email}
              </button>

              <div className="text-center">
                <h2 className="text-2xl font-display font-bold">
                  Passwort eingeben
                </h2>
              </div>

              {/* Password Option */}
              <form onSubmit={handlePasswordSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Passwort</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    autoComplete="current-password"
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Anmelden
                </Button>

                <div className="flex justify-between text-sm">
                  <a
                    href="/register"
                    className="text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Konto erstellen
                  </a>
                  <a
                    href="/forgot-password"
                    className="text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Passwort vergessen?
                  </a>
                </div>
              </form>
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground">
            Mit der Anmeldung akzeptierst du unsere{" "}
            <a href="/datenschutz" className="underline hover:text-foreground">
              Datenschutzerklärung
            </a>
          </p>

          <footer className="text-xs text-center text-muted-foreground space-x-4 pt-8">
            <a href="/impressum" className="hover:underline hover:text-foreground">
              Impressum
            </a>
            <a href="/datenschutz" className="hover:underline hover:text-foreground">
              Datenschutz
            </a>
          </footer>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageSkeleton />}>
      <LoginContent />
    </Suspense>
  )
}

function LoginPageSkeleton() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary/80" />
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8 animate-pulse">
          <div className="h-8 bg-muted rounded w-32 mx-auto" />
          <div className="h-4 bg-muted rounded w-48 mx-auto" />
          <div className="space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
