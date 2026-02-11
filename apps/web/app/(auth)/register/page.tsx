'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordStrength } from '@/components/auth/password-strength';
import { validatePassword } from '@/lib/password-validation';
import { authClient } from '@/lib/auth-client';
import { useSessionQuery, useClearSession } from '@/hooks/use-session';
import { getAuthBroadcast } from '@/lib/broadcast-auth';
import { TurnstileWidget } from '@/components/auth/turnstile-widget';
import { sanitizeCallbackUrl } from '@/lib/url-validation';
import { ArrowLeft, Loader2, Check, Sparkles, LogOut, LayoutDashboard } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LegalFooterLinks,
  DatenschutzLink,
  NutzungsbedingungenLink,
} from '@/components/layout/legal-links';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isLoading: isPending } = useSessionQuery();
  const clearSession = useClearSession();
  const callbackUrl = sanitizeCallbackUrl(searchParams.get('callbackUrl'));
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmailExistsError, setIsEmailExistsError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const userInputs = [email, name].filter(Boolean);

  const clearError = () => {
    setError(null);
    setIsEmailExistsError(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setIsLoading(true);

    // Validate email
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Bitte gib eine gültige E-Mail-Adresse ein');
      setIsLoading(false);
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein');
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
      // Register with Better Auth
      // Note: name is required by Better Auth, use email prefix as fallback
      const { data, error: signUpError } = await authClient.signUp.email({
        email,
        password,
        name: name.trim() || email.split('@')[0],
        fetchOptions: captchaToken
          ? { headers: { 'x-captcha-response': captchaToken } }
          : undefined,
      });

      if (signUpError) {
        // Handle specific error cases
        if (
          signUpError.message?.includes('already exists') ||
          signUpError.code === 'USER_ALREADY_EXISTS'
        ) {
          // SEC-011: Show recovery links for existing email
          setError('Ein Konto mit dieser E-Mail-Adresse existiert bereits.');
          setIsEmailExistsError(true);
        } else {
          setError(signUpError.message || 'Registrierung fehlgeschlagen');
        }
        setCaptchaToken(null);
        setIsLoading(false);
        return;
      }

      if (data) {
        // Registration successful - Better Auth auto-signs in
        // Notify other tabs
        getAuthBroadcast().notifyLogin();

        // Show success state briefly then redirect to callback URL (e.g., join page)
        // Use window.location.href for full page reload to ensure fresh session data
        setSuccess(true);
        setTimeout(() => {
          window.location.href = callbackUrl;
        }, 1500);
      }
    } catch {
      setError('Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
      setCaptchaToken(null);
      setIsLoading(false);
    }
  };

  const handleLogoutAndRegister = async () => {
    getAuthBroadcast().notifyLogout();
    getAuthBroadcast().clearAuthState();
    clearSession();
    await authClient.signOut();
    // Page will re-render without session, showing the registration form
  };

  // Show loading while checking session
  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="bg-card border rounded-2xl p-8 sm:p-10 shadow-sm animate-pulse">
            <div className="h-6 w-32 bg-muted/50 rounded mb-6" />
            <div className="h-9 w-40 bg-muted/50 rounded mx-auto mb-6" />
            <div className="h-8 w-48 bg-muted/50 rounded mx-auto mb-2" />
            <div className="h-4 w-36 bg-muted/50 rounded mx-auto mb-8" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show "already logged in" state
  if (session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
            <div className="h-1 bg-linear-to-r from-(--brand-cobalt) via-(--brand-cyan) to-(--brand-green)" />
            <div className="p-8 sm:p-10 text-center">
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

              <h2 className="text-2xl font-display font-bold mb-2">Bereits angemeldet</h2>
              <p className="text-muted-foreground mb-6">
                Du bist als{' '}
                <span className="font-medium text-foreground">{session.user.email}</span>{' '}
                angemeldet.
              </p>

              <div className="space-y-3">
                <Button onClick={() => router.push('/dashboard')} className="w-full">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Zum Dashboard
                </Button>
                <Button variant="outline" onClick={handleLogoutAndRegister} className="w-full">
                  <LogOut className="mr-2 h-4 w-4" />
                  Abmelden und neues Konto erstellen
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-8 text-xs text-center text-foreground/70 space-x-4">
            <LegalFooterLinks />
          </footer>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
            <div className="h-1 bg-linear-to-r from-(--brand-cobalt) via-(--brand-cyan) to-(--brand-green)" />
            <div className="p-8 sm:p-10 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-6">
                <Check className="h-8 w-8 text-success" />
              </div>
              <h2 className="text-2xl font-display font-bold mb-2">Konto erstellt!</h2>
              <p className="text-muted-foreground">Du wirst zum Dashboard weitergeleitet...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
          <div className="h-1 bg-linear-to-r from-(--brand-cobalt) via-(--brand-cyan) to-(--brand-green)" />
          <div className="p-8 sm:p-10">
            {/* Back link */}
            <Link
              href={
                callbackUrl !== '/dashboard'
                  ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
                  : '/login'
              }
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
              <h1 className="text-2xl font-display font-bold">Konto erstellen</h1>
              <p className="text-muted-foreground mt-2">Starte mit ClubManager durch</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail-Adresse</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.de"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearError();
                  }}
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
                  onChange={(e) => {
                    setName(e.target.value);
                    clearError();
                  }}
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearError();
                  }}
                  autoComplete="new-password"
                  required
                />
                <PasswordStrength password={password} userInputs={userInputs} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearError();
                  }}
                  autoComplete="new-password"
                  required
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-destructive">Die Passwörter stimmen nicht überein</p>
                )}
              </div>

              {error &&
                (isEmailExistsError ? (
                  <div className="text-sm text-destructive">
                    {error}{' '}
                    <Link href="/login" className="underline font-medium">
                      Anmelden
                    </Link>{' '}
                    oder{' '}
                    <Link href="/forgot-password" className="underline font-medium">
                      Passwort vergessen?
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm text-destructive">{error}</p>
                ))}

              <TurnstileWidget
                onToken={setCaptchaToken}
                onExpire={() => setCaptchaToken(null)}
                onError={() => setCaptchaToken(null)}
              />

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
              Mit der Registrierung akzeptierst du unsere{' '}
              <NutzungsbedingungenLink className="text-accent hover:underline" /> und{' '}
              <DatenschutzLink className="text-accent hover:underline" />
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-8 bg-muted border rounded-xl p-4">
          <div className="flex items-center gap-3 text-sm">
            <div className="shrink-0 w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
              <Check className="h-4 w-4 text-success" />
            </div>
            <div className="text-muted-foreground">
              <span className="font-medium text-foreground">Kostenlos starten</span> - Keine
              Kreditkarte erforderlich
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-xs text-center text-foreground/70 space-x-4">
          <LegalFooterLinks />
        </footer>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterPageSkeleton />}>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterPageSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md">
        <div className="bg-card border rounded-2xl p-8 sm:p-10 shadow-sm animate-pulse">
          <div className="h-6 w-32 bg-muted/50 rounded mb-6" />
          <div className="h-9 w-40 bg-muted/50 rounded mx-auto mb-6" />
          <div className="h-8 w-48 bg-muted/50 rounded mx-auto mb-2" />
          <div className="h-4 w-36 bg-muted/50 rounded mx-auto mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
