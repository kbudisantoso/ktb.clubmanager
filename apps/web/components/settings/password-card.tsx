'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useConnectedAccounts, useChangePassword } from '@/hooks/use-security';
import { useSessionQuery } from '@/hooks/use-session';
import { PasswordStrength } from '@/components/auth/password-strength';
import { validatePassword } from '@/lib/password-validation';

// ============================================================================
// Main component
// ============================================================================

export function PasswordCard() {
  const { data: accounts, isLoading: accountsLoading } = useConnectedAccounts();
  const { data: session } = useSessionQuery();
  const changePassword = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const hasCredential = accounts?.some((a) => a.providerId === 'credential') ?? false;

  // Context words for zxcvbn to penalize (same pattern as register form)
  const userInputs = [session?.user?.email, session?.user?.name].filter(Boolean) as string[];

  // Validation
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    !changePassword.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setValidationError(null);

    // Validate password strength (async, includes HaveIBeenPwned check)
    const validation = await validatePassword(newPassword, userInputs);
    if (!validation.valid) {
      setValidationError(validation.errors[0]);
      return;
    }

    await changePassword.mutateAsync(
      { currentPassword, newPassword, revokeOtherSessions },
      {
        onSuccess: () => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setRevokeOtherSessions(false);
          setValidationError(null);
        },
      }
    );
  };

  if (accountsLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Passwort</CardTitle>
        <CardDescription>
          {hasCredential
            ? 'Aendere dein Passwort'
            : 'Du hast dich ueber einen externen Dienst angemeldet'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasCredential ? (
          <p className="text-sm text-muted-foreground">
            Du hast dich ueber einen externen Dienst angemeldet. Ein Passwort ist nicht
            erforderlich.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Aktuelles Passwort</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Neues Passwort</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setValidationError(null);
                }}
                autoComplete="new-password"
              />
              <PasswordStrength password={newPassword} userInputs={userInputs} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Neues Passwort bestaetigen</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              {passwordsMismatch && (
                <p className="text-xs text-destructive">Passwoerter stimmen nicht ueberein</p>
              )}
            </div>

            {validationError && <p className="text-sm text-destructive">{validationError}</p>}

            <div className="flex items-center gap-2">
              <Checkbox
                id="revoke-sessions"
                checked={revokeOtherSessions}
                onCheckedChange={(checked) => setRevokeOtherSessions(checked === true)}
              />
              <Label htmlFor="revoke-sessions" className="font-normal">
                Alle anderen Sitzungen beenden
              </Label>
            </div>

            <Button type="submit" disabled={!canSubmit}>
              {changePassword.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Passwort aendern
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
