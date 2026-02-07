'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GoogleIcon } from '@/components/icons';
import { authClient } from '@/lib/auth-client';
import { useSessionQuery } from '@/hooks/use-session';
import { getAuthBroadcast } from '@/lib/broadcast-auth';
import { ArrowLeft, Loader2, Check } from 'lucide-react';
import { LegalFooterLinks } from '@/components/layout/legal-links';

type LoginStep = 'email' | 'auth-options';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isLoading: isPending } = useSessionQuery();
  const signedOut = searchParams.get('signedOut') === 'true';
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!isPending && session?.user && !signedOut) {
      router.replace(callbackUrl);
    }
  }, [session, isPending, signedOut, callbackUrl, router]);

  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for focus management
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Check if Google OAuth is enabled (client-side check via env var)
  const googleEnabled = !!process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED;

  // Focus email input on mount
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  // Focus password input when switching to password step
  useEffect(() => {
    if (step === 'auth-options') {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 50);
    }
  }, [step]);

  const validateAndProceed = () => {
    if (!email.trim()) {
      setError('Bitte gib deine E-Mail-Adresse ein');
      return;
    }
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Bitte gib eine gültige E-Mail-Adresse ein');
      return;
    }
    setError(null);
    setStep('auth-options');
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validateAndProceed();
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      validateAndProceed();
    }
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitPassword();
  };

  const handlePasswordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitPassword();
    }
  };

  const submitPassword = async () => {
    if (!password.trim()) {
      setError('Bitte gib dein Passwort ein');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await authClient.signIn.email({
        email,
        password,
      });

      if (signInError) {
        setError('E-Mail oder Passwort ist falsch');
        setIsLoading(false);
        return;
      }

      if (data) {
        // Notify other tabs
        getAuthBroadcast().notifyLogin();
        // Redirect to callback URL
        window.location.href = callbackUrl;
      }
    } catch {
      setError('Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: callbackUrl,
      });
    } catch {
      setError('Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
      setIsLoading(false);
    }
  };

  const goBack = () => {
    setStep('email');
    setPassword('');
    setError(null);
    // Focus email input after going back
    setTimeout(() => {
      emailInputRef.current?.focus();
    }, 50);
  };

  // Show loading while checking session (to avoid flash of login form)
  if (isPending || (!signedOut && session?.user)) {
    return <LoginPageSkeleton />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md">
        {/* Glass Panel */}
        <div className="glass-panel rounded-2xl p-8 sm:p-10">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Image
              src="/logo.svg"
              alt="ClubManager"
              width={200}
              height={50}
              className="h-10 w-auto dark:hidden"
              priority
            />
            <Image
              src="/logo-darkbg.svg"
              alt="ClubManager"
              width={200}
              height={50}
              className="h-10 w-auto hidden dark:block"
              priority
            />
          </div>

          {step === 'email' ? (
            /* Step 1: Email input */
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-display font-bold gradient-text">Willkommen zurück</h1>
                <p className="text-muted-foreground mt-2">Melde dich an, um fortzufahren</p>
              </div>

              {signedOut && (
                <div className="glass-card rounded-lg p-3 text-sm text-success border-success/20">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Du wurdest erfolgreich abgemeldet.
                  </div>
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail-Adresse</Label>
                  <Input
                    ref={emailInputRef}
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@example.de"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    onKeyDown={handleEmailKeyDown}
                    autoComplete="username email"
                    className="glass-input"
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" className="w-full " disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Weiter
                </Button>
              </form>

              {googleEnabled && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="glass-card px-3 py-1 rounded-full text-muted-foreground">
                        oder
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full glass-input hover:bg-white/80 dark:hover:bg-white/10"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                  >
                    <GoogleIcon className="mr-2 h-5 w-5" />
                    Mit Google anmelden
                  </Button>
                </>
              )}

              <p className="text-center text-sm text-muted-foreground">
                Noch kein Konto?{' '}
                <Link
                  href={
                    callbackUrl !== '/dashboard'
                      ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
                      : '/register'
                  }
                  className="text-accent hover:underline font-medium"
                >
                  Jetzt registrieren
                </Link>
              </p>
            </div>
          ) : (
            /* Step 2: Password input */
            <div className="space-y-6">
              <button
                type="button"
                onClick={goBack}
                className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                {email}
              </button>

              <div className="text-center">
                <h1 className="text-2xl font-display font-bold gradient-text">Passwort eingeben</h1>
              </div>

              <form onSubmit={handlePasswordSignIn} className="space-y-4" noValidate>
                {/* Hidden email field for password manager to correctly save credentials */}
                <input
                  type="email"
                  name="email"
                  value={email}
                  autoComplete="username email"
                  readOnly
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                />
                <div className="space-y-2">
                  <Label htmlFor="password">Passwort</Label>
                  <Input
                    ref={passwordInputRef}
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    onKeyDown={handlePasswordKeyDown}
                    autoComplete="current-password"
                    className="glass-input"
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" className="w-full " disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Anmelden
                </Button>

                <div className="flex justify-between text-sm">
                  <Link
                    href={
                      callbackUrl !== '/dashboard'
                        ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
                        : '/register'
                    }
                    className="text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Konto erstellen
                  </Link>
                  <Link
                    href="/forgot-password"
                    className="text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Passwort vergessen?
                  </Link>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-8 text-xs text-center text-foreground/70 space-x-4">
          <LegalFooterLinks />
        </footer>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageSkeleton />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginPageSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md">
        <div className="glass-panel rounded-2xl p-8 sm:p-10 animate-pulse">
          <div className="h-10 w-40 bg-muted/50 rounded mx-auto mb-8" />
          <div className="h-8 w-48 bg-muted/50 rounded mx-auto mb-2" />
          <div className="h-4 w-36 bg-muted/50 rounded mx-auto mb-8" />
          <div className="space-y-4">
            <div className="h-4 w-24 bg-muted/50 rounded" />
            <div className="h-10 bg-muted/50 rounded" />
            <div className="h-10 bg-muted/50 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
