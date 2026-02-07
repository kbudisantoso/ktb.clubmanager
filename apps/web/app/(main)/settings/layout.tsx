'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsSidebar } from '@/components/layout/settings-sidebar';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Einstellungen</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <SettingsSidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
