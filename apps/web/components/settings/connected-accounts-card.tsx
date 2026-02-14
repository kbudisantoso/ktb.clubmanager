'use client';

import { KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  useConnectedAccounts,
  useUnlinkAccount,
  type ConnectedAccount,
} from '@/hooks/use-security';

// ============================================================================
// Helpers
// ============================================================================

/** Simple SVG icon for Google */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function getProviderInfo(providerId: string): { label: string; icon: React.ReactNode } {
  switch (providerId) {
    case 'google':
      return { label: 'Google', icon: <GoogleIcon className="size-4" /> };
    case 'credential':
      return { label: 'E-Mail & Passwort', icon: <KeyRound className="size-4" /> };
    default:
      return { label: providerId, icon: <KeyRound className="size-4" /> };
  }
}

// ============================================================================
// Account row
// ============================================================================

function AccountRow({
  account,
  isLastAccount,
  onUnlink,
  isUnlinking,
}: {
  account: ConnectedAccount;
  isLastAccount: boolean;
  onUnlink: (providerId: string) => void;
  isUnlinking: boolean;
}) {
  const { label, icon } = getProviderInfo(account.providerId);
  const isCredential = account.providerId === 'credential';
  const canUnlink = !isCredential && !isLastAccount;

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      {!isCredential && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUnlink(account.providerId)}
                  disabled={!canUnlink || isUnlinking}
                >
                  {isUnlinking && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  Trennen
                </Button>
              </span>
            </TooltipTrigger>
            {isLastAccount && (
              <TooltipContent>Letzte Anmeldemethode kann nicht entfernt werden</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

// ============================================================================
// Main component
// ============================================================================

export function ConnectedAccountsCard() {
  const { data: accounts, isLoading } = useConnectedAccounts();
  const unlinkAccount = useUnlinkAccount();

  const isLastAccount = (accounts?.length ?? 0) <= 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verknuepfte Konten</CardTitle>
        <CardDescription>Anmeldungen ueber externe Dienste</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3" data-testid="accounts-skeleton">
            <Skeleton className="h-10 w-full" />
          </div>
        ) : accounts && accounts.length > 0 ? (
          <div className="divide-y">
            {accounts.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                isLastAccount={isLastAccount}
                onUnlink={(providerId) => unlinkAccount.mutate(providerId)}
                isUnlinking={
                  unlinkAccount.isPending && unlinkAccount.variables === account.providerId
                }
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Keine verknuepften Konten</p>
        )}
      </CardContent>
    </Card>
  );
}
