import { PageHeader } from '@/components/layout/page-header';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PageHeader title="Einstellungen" />
      <div className="p-4 md:p-6">
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
