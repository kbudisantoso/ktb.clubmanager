import { Header } from '@/components/layout/header';
import { ClubSync } from '@/components/providers/club-sync';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ClubSync />
      <div className="relative min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 glass-panel rounded-none border-x-0 border-b-0">{children}</main>
      </div>
    </>
  );
}
