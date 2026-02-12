'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { UpdateMemberSchema } from '@ktb/shared';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useUpdateMember } from '@/hooks/use-members';
import { useToast } from '@/hooks/use-toast';
import type { MemberDetail } from '@/hooks/use-member-detail';
import { BasicInfoTab } from './basic-info-tab';
import { AddressContactTab } from './address-contact-tab';
import { MembershipTab } from './membership-tab';
import { NotesTab } from './notes-tab';

// ============================================================================
// Types
// ============================================================================

/** Form values for the update form (uses schema _input for zodResolver compatibility) */
type FormValues = (typeof UpdateMemberSchema)['_input'];

interface MemberFormProps {
  /** Full member data */
  member: MemberDetail;
  /** Club slug for API calls */
  slug: string;
  /** Called when status change button is clicked */
  onChangeStatus?: () => void;
}

// ============================================================================
// Helper: Convert MemberDetail to form values
// ============================================================================

function memberToFormValues(member: MemberDetail): FormValues {
  return {
    personType: member.personType as FormValues['personType'],
    salutation: (member.salutation as FormValues['salutation']) ?? undefined,
    title: member.title ?? undefined,
    firstName: member.firstName ?? undefined,
    lastName: member.lastName ?? undefined,
    nickname: member.nickname ?? undefined,
    organizationName: member.organizationName ?? undefined,
    contactFirstName: member.contactFirstName ?? undefined,
    contactLastName: member.contactLastName ?? undefined,
    department: member.department ?? undefined,
    position: member.position ?? undefined,
    vatId: member.vatId ?? undefined,
    email: member.email ?? undefined,
    phone: member.phone ?? undefined,
    mobile: member.mobile ?? undefined,
    notes: member.notes ?? undefined,
    street: member.street ?? undefined,
    houseNumber: member.houseNumber ?? undefined,
    addressExtra: member.addressExtra ?? undefined,
    postalCode: member.postalCode ?? undefined,
    city: member.city ?? undefined,
    country: member.country ?? 'DE',
  };
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Always-editable member form with vertical sections.
 * All fields are editable — a sticky save bar appears when the form is dirty.
 */
export function MemberForm({ member, slug, onChangeStatus }: MemberFormProps) {
  const { toast } = useToast();
  const updateMember = useUpdateMember(slug);

  const defaultValues = useMemo(() => memberToFormValues(member), [member]);

  const form = useForm<FormValues>({
    resolver: zodResolver(UpdateMemberSchema),
    defaultValues,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors, isDirty, isSubmitting },
  } = form;

  // Reset form when member data changes (e.g., after save or external refresh)
  useEffect(() => {
    reset(memberToFormValues(member));
  }, [member, reset]);

  // ============================================================================
  // Submit handler — only sends changed fields
  // ============================================================================

  const onSubmit = useCallback(
    async (data: FormValues) => {
      try {
        const changed: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data)) {
          const original = defaultValues[key as keyof FormValues];
          if (value !== original && value !== '' && value !== undefined) {
            changed[key] = value;
          }
          // Handle clearing a field (was set, now empty)
          if ((value === '' || value === undefined) && original) {
            changed[key] = null;
          }
        }

        if (Object.keys(changed).length === 0) {
          return;
        }

        await updateMember.mutateAsync({ id: member.id, ...changed });
        toast({ title: 'Änderungen gespeichert' });
      } catch (error) {
        toast({
          title: 'Fehler beim Speichern',
          description:
            error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten',
          variant: 'destructive',
        });
      }
    },
    [defaultValues, member.id, updateMember, toast]
  );

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 p-4 pb-6">
      {/* Section: Stammdaten */}
      <SectionHeader title="Stammdaten" />
      <BasicInfoTab
        member={member}
        isEditing={true}
        register={register}
        control={control}
        setValue={setValue}
        watch={watch}
        errors={errors}
        disabled={isSubmitting}
      />

      <Separator />

      {/* Section: Adresse & Kontakt */}
      <SectionHeader title="Adresse & Kontakt" />
      <AddressContactTab
        member={member}
        isEditing={true}
        register={register}
        setValue={setValue}
        watch={watch}
        errors={errors}
        disabled={isSubmitting}
      />

      <Separator />

      {/* Section: Mitgliedschaft */}
      <SectionHeader title="Mitgliedschaft" />
      <MembershipTab member={member} slug={slug} onChangeStatus={onChangeStatus} />

      <Separator />

      {/* Section: Notizen */}
      <SectionHeader title="Notizen" />
      <NotesTab
        member={member}
        isEditing={true}
        register={register}
        watch={watch}
        disabled={isSubmitting}
      />

      {/* Sticky save bar — only visible when form has unsaved changes */}
      {isDirty && (
        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t bg-background pt-3 pb-1">
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

// ============================================================================
// Section Header
// ============================================================================

function SectionHeader({ title }: { title: string }) {
  return <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>;
}
