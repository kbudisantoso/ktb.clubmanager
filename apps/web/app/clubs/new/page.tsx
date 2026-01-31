'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useClubStore, type ClubContext } from '@/lib/club-store';
import { useToast } from '@/hooks/use-toast';

export default function NewClubPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { setActiveClub, setClubs } = useClubStore();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PRIVATE' | 'PUBLIC'>('PRIVATE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);

  // Auto-generate slug from name
  async function handleNameChange(newName: string) {
    setName(newName);

    if (!slugEdited && newName.length >= 2) {
      // Simple slug generation (server will do proper one)
      const generated = newName
        .toLowerCase()
        .replace(/[äÄ]/g, 'ae')
        .replace(/[öÖ]/g, 'oe')
        .replace(/[üÜ]/g, 'ue')
        .replace(/[ß]/g, 'ss')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50);
      setSlug(generated);
      checkSlugAvailability(generated);
    }
  }

  async function handleSlugChange(newSlug: string) {
    setSlugEdited(true);
    setSlug(newSlug.toLowerCase());
    checkSlugAvailability(newSlug.toLowerCase());
  }

  async function checkSlugAvailability(slugToCheck: string) {
    if (slugToCheck.length < 3) {
      setSlugAvailable(null);
      return;
    }

    try {
      const res = await fetch(
        `/api/clubs/check-slug?slug=${encodeURIComponent(slugToCheck)}`,
        {
          credentials: 'include',
        }
      );
      if (res.ok) {
        const data = await res.json();
        setSlugAvailable(data.available);
      }
    } catch {
      setSlugAvailable(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/clubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          slug: slug || undefined, // Let server generate if empty
          description: description || undefined,
          visibility,
        }),
      });

      if (res.ok) {
        const club = await res.json();

        // Update club store
        const clubsRes = await fetch('/api/clubs/my', { credentials: 'include' });
        if (clubsRes.ok) {
          const clubs = await clubsRes.json();
          setClubs(
            clubs.map((c: ClubContext & { avatarUrl?: string }) => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              role: c.role,
              avatarUrl: c.avatarUrl,
              avatarInitials: c.avatarInitials,
              avatarColor: c.avatarColor,
            }))
          );
        }

        setActiveClub(club.slug);
        router.push(`/clubs/${club.slug}/dashboard`);
      } else {
        const error = await res.json();
        toast({
          title: 'Fehler',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Neuen Verein erstellen</CardTitle>
              <CardDescription>
                Erstelle einen neuen Verein und lade Mitglieder ein.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Vereinsname *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="z.B. TSV Musterstadt 1920"
                required
                minLength={2}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL-Pfad</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">/clubs/</span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="tsv-musterstadt"
                  className="font-mono"
                  minLength={3}
                  maxLength={50}
                  pattern="[a-z0-9][a-z0-9-]*[a-z0-9]|[a-z0-9]{1,2}"
                />
              </div>
              {slug.length >= 3 && (
                <p
                  className={`text-sm ${slugAvailable ? 'text-green-600' : slugAvailable === false ? 'text-red-600' : 'text-muted-foreground'}`}
                >
                  {slugAvailable === true && 'Verfügbar'}
                  {slugAvailable === false && 'Bereits vergeben'}
                  {slugAvailable === null && 'Wird geprüft...'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Kurze Beschreibung des Vereins..."
                maxLength={1000}
              />
            </div>

            <div className="space-y-3">
              <Label>Sichtbarkeit</Label>
              <RadioGroup
                value={visibility}
                onValueChange={(v) => setVisibility(v as 'PRIVATE' | 'PUBLIC')}
              >
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <RadioGroupItem value="PRIVATE" id="private" className="mt-1" />
                  <div>
                    <Label htmlFor="private" className="font-medium cursor-pointer">
                      Privat
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Mitglieder können nur mit Einladungscode beitreten
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <RadioGroupItem value="PUBLIC" id="public" className="mt-1" />
                  <div>
                    <Label htmlFor="public" className="font-medium cursor-pointer">
                      Öffentlich
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Der Verein ist sichtbar und Mitglieder können den Beitritt
                      anfragen
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Abbrechen
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !name || slugAvailable === false}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Verein erstellen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
