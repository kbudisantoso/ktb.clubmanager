'use client';

import { SessionsCard } from '@/components/settings/sessions-card';
import { ConnectedAccountsCard } from '@/components/settings/connected-accounts-card';
import { PasswordCard } from '@/components/settings/password-card';
import { DangerZoneCard } from '@/components/settings/danger-zone-card';

export default function SecurityClient() {
  return (
    <div className="space-y-6">
      <SessionsCard />
      <ConnectedAccountsCard />
      <PasswordCard />
      <DangerZoneCard />
    </div>
  );
}
