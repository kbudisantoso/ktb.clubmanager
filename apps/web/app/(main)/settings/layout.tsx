'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Building2, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/settings', label: 'Profil', icon: User },
  { href: '/settings/clubs', label: 'Meine Vereine', icon: Building2 },
  { href: '/settings/notifications', label: 'Benachrichtigungen', icon: Bell },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Einstellungen</h1>

      <div className="flex flex-col md:flex-row gap-8">
        <nav className="md:w-48 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={pathname === item.href ? 'secondary' : 'ghost'}
                className={cn('w-full justify-start gap-2')}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
