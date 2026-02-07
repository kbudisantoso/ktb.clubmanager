import { Header } from '@/components/layout/header';
import { ClubSync } from '@/components/providers/club-sync';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ClubSync />
      {/* Subtle gradient background for in-app pages */}
      <div className="app-background" />

      <div className="relative min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
      </div>
    </>
  );
}
