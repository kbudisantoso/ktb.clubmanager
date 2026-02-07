'use client';

import { useSessionQuery } from '@/hooks/use-session';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const { data: session, isLoading } = useSessionQuery();

  if (isLoading || !session?.user) {
    return <ProfileSkeleton />;
  }

  const user = session.user;
  // Use first letter of first word + first letter of last word
  const initials = user.name
    ? (() => {
        const words = user.name.split(' ').filter(Boolean);
        if (words.length >= 2) {
          return (words[0][0] + words[words.length - 1][0]).toUpperCase();
        }
        return words[0]?.[0]?.toUpperCase() || null;
      })()
    : user.email?.charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>Deine persönlichen Informationen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.image || undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium text-lg">{user.name || 'Kein Name'}</div>
              <div className="text-muted-foreground">{user.email}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
