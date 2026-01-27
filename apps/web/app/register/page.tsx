"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrength } from "@/components/auth/password-strength";
import { validatePassword } from "@/lib/password-validation";
import { ArrowLeft, Loader2, Check } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const userInputs = [email, name].filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Validate email
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Bitte geben Sie eine gultige E-Mail-Adresse ein");
      setIsLoading(false);
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Die Passworter stimmen nicht uberein");
      setIsLoading(false);
      return;
    }

    // Validate password strength
    const validation = await validatePassword(password, userInputs);
    if (!validation.valid) {
      setError(validation.errors[0]);
      setIsLoading(false);
      return;
    }

    try {
      // TODO: Implement GoTrue user registration
      // This will call GoTrue /signup endpoint
      console.log("Register:", { email, name, password });

      // Show success state
      setSuccess(true);
    } catch {
      setError("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
            <Check className="h-6 w-6 text-success" />
          </div>
          <h2 className="text-2xl font-display font-bold">Konto erstellt!</h2>
          <p className="text-muted-foreground">
            Wir haben Ihnen eine E-Mail gesendet. Bitte bestatigen Sie Ihre
            E-Mail-Adresse, um sich anzumelden.
          </p>
          <Link href="/login">
            <Button className="w-full">Zur Anmeldung</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <Link
            href="/login"
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Zuruck zur Anmeldung
          </Link>
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-display font-bold">Konto erstellen</h1>
          <p className="text-muted-foreground mt-2">
            Erstellen Sie ein Konto, um ktb.clubmanager zu nutzen
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail-Adresse</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              type="text"
              placeholder="Max Mustermann"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <PasswordStrength password={password} userInputs={userInputs} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Passwort bestatigen</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-sm text-destructive">
                Die Passworter stimmen nicht uberein
              </p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Konto erstellen
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground">
          Mit der Registrierung akzeptieren Sie unsere{" "}
          <Link
            href="/datenschutz"
            className="underline hover:text-foreground"
          >
            Datenschutzerklarung
          </Link>
        </p>

        <footer className="text-xs text-center text-muted-foreground space-x-4">
          <Link
            href="/impressum"
            className="hover:underline hover:text-foreground"
          >
            Impressum
          </Link>
          <Link
            href="/datenschutz"
            className="hover:underline hover:text-foreground"
          >
            Datenschutz
          </Link>
        </footer>
      </div>
    </div>
  );
}
