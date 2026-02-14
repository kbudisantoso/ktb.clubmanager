'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { UpdateProfileSchema } from '@ktb/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSessionQuery, useForceRefreshSession } from '@/hooks/use-session';
import { useUpdateProfile } from '@/hooks/use-profile';
import { useToast } from '@/hooks/use-toast';
import { AvatarUpload } from './avatar-upload';
import { API_URL } from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

type ProfileFormValues = (typeof UpdateProfileSchema)['_input'];

// ============================================================================
// Component
// ============================================================================

/**
 * Always-editable profile form with avatar upload and sticky save bar.
 * Follows the same pattern as ClubSettingsForm.
 */
export function ProfileForm() {
  const { data: session } = useSessionQuery();
  const { toast } = useToast();
  const updateProfile = useUpdateProfile();
  const forceRefreshSession = useForceRefreshSession();
  const [cacheBuster, setCacheBuster] = useState(0);

  const user = session?.user;

  const defaultValues = useMemo(
    (): ProfileFormValues => ({
      name: user?.name || '',
    }),
    [user?.name]
  );

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting, errors },
  } = form;

  // Reset form when session data changes (e.g. after external update)
  useEffect(() => {
    reset({ name: user?.name || '' });
  }, [user?.name, reset]);

  // Warn about unsaved changes on page leave
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Submit handler
  const onSubmit = useCallback(
    async (data: ProfileFormValues) => {
      try {
        await updateProfile.mutateAsync({ name: data.name });
        reset(data);
        toast({ title: 'Profil aktualisiert' });
      } catch (error) {
        toast({
          title: 'Fehler beim Speichern',
          description:
            error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten',
          variant: 'destructive',
        });
      }
    },
    [updateProfile, reset, toast]
  );

  // Avatar URL: permanent redirect endpoint with stable cache-buster
  const avatarUrl = user?.image
    ? `${API_URL}/api/me/avatar${cacheBuster ? `?v=${cacheBuster}` : ''}`
    : undefined;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col min-h-0">
      <div className="flex-1 space-y-6">
        {/* Avatar upload */}
        <div className="flex justify-center">
          <AvatarUpload
            currentImageUrl={avatarUrl}
            userName={user?.name || undefined}
            onAvatarUploaded={() => {
              setCacheBuster(Date.now());
              forceRefreshSession();
            }}
            disabled={isSubmitting}
          />
        </div>

        {/* Display name field */}
        <div className="space-y-2">
          <Label htmlFor="profile-name">Anzeigename</Label>
          <Input
            id="profile-name"
            {...register('name')}
            placeholder="Dein Name"
            disabled={isSubmitting}
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        {/* Email field (read-only) */}
        <div className="space-y-2">
          <Label htmlFor="profile-email">E-Mail</Label>
          <Input
            id="profile-email"
            value={user?.email || ''}
            disabled
            readOnly
            className="text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground">
            Die E-Mail-Adresse kann derzeit nicht geändert werden.
          </p>
        </div>
      </div>

      {/* Sticky save bar */}
      {isDirty && (
        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t bg-background px-4 py-3 mt-6">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => reset(defaultValues)}
            disabled={isSubmitting}
          >
            Verwerfen
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Speichern
          </Button>
        </div>
      )}
    </form>
  );
}
