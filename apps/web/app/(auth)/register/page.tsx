"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordStrength } from "@/components/auth/password-strength"
import { validatePassword } from "@/lib/password-validation"
import { authClient } from "@/lib/auth-client"
import { getAuthBroadcast } from "@/lib/broadcast-auth"
import { ArrowLeft, Loader2, Check, Sparkles } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const userInputs = [email, name].filter(Boolean)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    // Validate email
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Bitte gib eine gültige E-Mail-Adresse ein")
      setIsLoading(false)
      return
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein")
      setIsLoading(false)
      return
    }

    // Validate password strength
    const validation = await validatePassword(password, userInputs)
    if (!validation.valid) {
      setError(validation.errors[0])
      setIsLoading(false)
      return
    }

    try {
      // Register with Better Auth
      // Note: name is required by Better Auth, use email prefix as fallback
      const { data, error: signUpError } = await authClient.signUp.email({
        email,
        password,
        name: name.trim() || email.split("@")[0],
      })

      if (signUpError) {
        // Handle specific error cases
        if (signUpError.message?.includes("already exists") || signUpError.code === "USER_ALREADY_EXISTS") {
          setError("Ein Konto mit dieser E-Mail-Adresse existiert bereits")
        } else {
          setError(signUpError.message || "Registrierung fehlgeschlagen")
        }
        setIsLoading(false)
        return
      }

      if (data) {
        // Registration successful - Better Auth auto-signs in
        // Notify other tabs
        getAuthBroadcast().notifyLogin()

        // Show success state briefly then redirect
        setSuccess(true)
        setTimeout(() => {
          router.push("/dashboard")
        }, 1500)
      }
    } catch {
      setError("Ein Fehler ist aufgetreten. Bitte versuche es erneut.")
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="glass-panel rounded-2xl p-8 sm:p-10 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-6">
              <Check className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-2xl font-display font-bold gradient-text mb-2">
              Konto erstellt!
            </h2>
            <p className="text-muted-foreground">
              Du wirst zum Dashboard weitergeleitet...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md">
        {/* Glass Panel */}
        <div className="glass-panel rounded-2xl p-8 sm:p-10">
          {/* Back link */}
          <Link
            href="/login"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Zurück zur Anmeldung
          </Link>

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Image
              src="/logo.svg"
              alt="ClubManager"
              width={180}
              height={45}
              className="h-9 w-auto dark:hidden"
              priority
            />
            <Image
              src="/logo-darkbg.svg"
              alt="ClubManager"
              width={180}
              height={45}
              className="h-9 w-auto hidden dark:block"
              priority
            />
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-display font-bold gradient-text">
              Konto erstellen
            </h1>
            <p className="text-muted-foreground mt-2">
              Starte mit ClubManager durch
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail-Adresse</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.de"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                autoComplete="email"
                required
                className="glass-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="Max Mustermann"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(null); }}
                autoComplete="name"
                className="glass-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                autoComplete="new-password"
                required
                className="glass-input"
              />
              <PasswordStrength password={password} userInputs={userInputs} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                autoComplete="new-password"
                required
                className="glass-input"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-destructive">
                  Die Passwörter stimmen nicht überein
                </p>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full " disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Konto erstellen
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-6">
            Mit der Registrierung akzeptierst du unsere{" "}
            <Link
              href="/datenschutz"
              className="text-accent hover:underline"
            >
              Datenschutzerklärung
            </Link>
          </p>
        </div>

        {/* Benefits - Below glass panel */}
        <div className="mt-8 glass-card rounded-xl p-4">
          <div className="flex items-center gap-3 text-sm">
            <div className="shrink-0 w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
              <Check className="h-4 w-4 text-success" />
            </div>
            <div className="text-muted-foreground">
              <span className="font-medium text-foreground">Kostenlos starten</span>
              {" "}- Keine Kreditkarte erforderlich
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-xs text-center text-muted-foreground/70 space-x-4">
          <Link href="/impressum" className="hover:text-foreground transition-colors">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:text-foreground transition-colors">
            Datenschutz
          </Link>
        </footer>
      </div>
    </div>
  )
}
