'use client';

import { PageHeader } from '@/components/layout/page-header';
import { SettingsSidebar } from '@/components/layout/settings-sidebar';

export default function ClubSettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PageHeader title="Einstellungen" />
      <div className="flex flex-col md:flex-row gap-8 p-4 md:p-6">
        <SettingsSidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
