import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  Home,
  BookOpen,
  List,
  Receipt,
  BarChart3,
  CreditCard,
  Landmark,
  Clock,
  Building2,
  Layers,
  Settings,
} from 'lucide-react';

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  comingSoon?: boolean;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

/**
 * Club navigation groups for the sidebar.
 * Items with comingSoon=true are shown with disabled styling.
 */
export function getClubNavGroups(slug: string): NavGroup[] {
  const base = `/clubs/${slug}`;

  return [
    {
      items: [{ title: 'Übersicht', url: `${base}/dashboard`, icon: LayoutDashboard }],
    },
    {
      label: 'Mitglieder',
      items: [
        { title: 'Mitglieder', url: `${base}/members`, icon: Users },
        { title: 'Haushalte', url: `${base}/households`, icon: Home, comingSoon: true },
      ],
    },
    {
      label: 'Finanzen',
      items: [
        { title: 'Buchungen', url: `${base}/accounting`, icon: BookOpen, comingSoon: true },
        { title: 'Kontenplan', url: `${base}/accounts`, icon: List, comingSoon: true },
        { title: 'Belege', url: `${base}/receipts`, icon: Receipt, comingSoon: true },
        { title: 'Berichte', url: `${base}/reports`, icon: BarChart3, comingSoon: true },
      ],
    },
    {
      label: 'Verwaltung',
      items: [
        { title: 'Beiträge', url: `${base}/fees`, icon: CreditCard, comingSoon: true },
        { title: 'SEPA', url: `${base}/sepa`, icon: Landmark, comingSoon: true },
        { title: 'Arbeitsstunden', url: `${base}/hours`, icon: Clock, comingSoon: true },
      ],
    },
  ];
}

/**
 * Admin (Kommandozentrale) navigation groups.
 */
export function getAdminNavGroups(): NavGroup[] {
  return [
    {
      items: [
        { title: 'Übersicht', url: '/admin', icon: LayoutDashboard },
        { title: 'Vereine', url: '/admin/clubs', icon: Building2 },
        { title: 'Tarife', url: '/admin/tiers', icon: Layers },
        { title: 'Einstellungen', url: '/admin/settings', icon: Settings },
      ],
    },
  ];
}
