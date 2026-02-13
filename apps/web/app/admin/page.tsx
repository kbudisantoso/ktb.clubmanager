'use client';

import { useEffect, useState } from 'react';
import { Building2, Users, Layers, Activity } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Stats {
  totalClubs: number;
  totalUsers: number;
  totalTiers: number;
  activeClubs: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      // Fetch stats from multiple endpoints
      const [clubsRes, tiersRes] = await Promise.all([
        apiFetch('/api/clubs'),
        apiFetch('/api/admin/tiers'),
      ]);

      const clubs = clubsRes.ok ? await clubsRes.json() : [];
      const tiers = tiersRes.ok ? await tiersRes.json() : [];

      // Calculate active clubs (clubs with users)
      const activeClubs = clubs.filter(
        (c: { userCount?: number }) => (c.userCount || 0) > 0
      ).length;

      setStats({
        totalClubs: clubs.length,
        totalUsers: 0, // Will be populated when users API is available
        totalTiers: tiers.length,
        activeClubs,
      });
    } finally {
      setIsLoading(false);
    }
  }

  const statCards = [
    {
      title: 'Vereine',
      value: stats?.totalClubs || 0,
      icon: Building2,
      description: `${stats?.activeClubs || 0} aktiv`,
    },
    {
      title: 'Benutzer',
      value: stats?.totalUsers || 0,
      icon: Users,
      description: 'Registrierte Benutzer',
    },
    {
      title: 'Tarife',
      value: stats?.totalTiers || 0,
      icon: Layers,
      description: 'Verfugbare Tarife',
    },
    {
      title: 'Aktivitat',
      value: '-',
      icon: Activity,
      description: 'Letzte 24h',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Verwaltungszentrale</h1>
        <p className="text-muted-foreground mt-2">Systemubersicht und Administration</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '-' : card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
