'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { CreateMemberSchema } from '@ktb/shared';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateInput } from '@/components/ui/date-input';
import { useCreateMember } from '@/hooks/use-members';
import { useNumberRanges } from '@/hooks/use-number-ranges';
import { useToast } from '@/hooks/use-toast';
import { PersonTypeToggle } from './person-type-toggle';
import { AddressAutocomplete } from './address-autocomplete';

/**
 * Form values type extracted from schema input shape.
 * Uses _input to match what zodResolver expects (before defaults/refine).
 */
type FormValues = (typeof CreateMemberSchema)['_input'];

/** German labels for salutation */
const SALUTATION_OPTIONS = [
  { value: 'HERR', label: 'Herr' },
  { value: 'FRAU', label: 'Frau' },
  { value: 'DIVERS', label: 'Divers' },
] as const;

/** German labels for member status */
const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Ausstehend' },
  { value: 'ACTIVE', label: 'Aktiv' },
  { value: 'INACTIVE', label: 'Inaktiv' },
  { value: 'LEFT', label: 'Ausgetreten' },
] as const;

/** German labels for membership type */
const MEMBERSHIP_TYPE_OPTIONS = [
  { value: 'ORDENTLICH', label: 'Ordentlich' },
  { value: 'PASSIV', label: 'Passiv' },
  { value: 'EHREN', label: 'Ehren' },
  { value: 'FOERDER', label: 'Förder' },
  { value: 'JUGEND', label: 'Jugend' },
] as const;

interface MemberCreateSheetProps {
  /** Club slug for API calls */
  slug: string;
  /** Whether the sheet is open */
  open: boolean;
  /** Callback when sheet should close */
  onOpenChange: (open: boolean) => void;
}

/**
 * Quick-create member sheet (slides from right).
 * Uses react-hook-form with zodResolver for validation.
 * Supports person type toggle, OpenPLZ address autocomplete, and auto member number.
 */
export function MemberCreateSheet({ slug, open, onOpenChange }: MemberCreateSheetProps) {
  const { toast } = useToast();
  const createMember = useCreateMember(slug);
  const { data: numberRanges } = useNumberRanges(slug);

  // Check if auto-generation is available
  const memberNumberRange = useMemo(
    () => (numberRanges ?? []).find((r) => r.entityType === 'MEMBER'),
    [numberRanges]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateMemberSchema),
    defaultValues: {
      personType: 'NATURAL',
      firstName: '',
      lastName: '',
      status: 'PENDING',
      country: 'DE',
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  const personType = watch('personType');
  const joinDate = watch('joinDate');

  // Reset form when sheet opens
  useEffect(() => {
    if (open) {
      reset({
        personType: 'NATURAL',
        firstName: '',
        lastName: '',
        status: 'PENDING',
        country: 'DE',
      });
    }
  }, [open, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      // Remove empty strings to let backend handle defaults
      const cleaned = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== '' && v !== undefined)
      ) as FormValues;

      await createMember.mutateAsync(cleaned);

      const displayName =
        data.personType === 'LEGAL_ENTITY'
          ? data.organizationName
          : `${data.firstName} ${data.lastName}`;

      toast({
        title: `Mitglied ${displayName} angelegt`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Fehler beim Anlegen',
        description:
          error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten',
        variant: 'destructive',
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-hidden">
        <SheetHeader>
          <SheetTitle>Neues Mitglied</SheetTitle>
          <SheetDescription>
            Erfasse die wichtigsten Daten. Details kannst du später ergänzen.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col min-h-0">
          {/* Scrollable fields */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="flex flex-col gap-6">
              {/* Section 1: Person Type Toggle */}
              <div className="space-y-2">
                <Label>Personenart</Label>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <PersonTypeToggle control={form.control as any} disabled={isSubmitting} />
              </div>

              {/* Section 2: Name fields (NATURAL) */}
              {personType === 'NATURAL' && (
                <div className="space-y-3">
                  {/* Salutation + Title */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="salutation">Anrede</Label>
                      <Select
                        disabled={isSubmitting}
                        onValueChange={(val) =>
                          setValue('salutation', val as FormValues['salutation'])
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Bitte wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {SALUTATION_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="title">Titel</Label>
                      <Input
                        id="title"
                        placeholder="Dr., Prof."
                        disabled={isSubmitting}
                        {...register('title')}
                      />
                    </div>
                  </div>

                  {/* First + Last name */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName">
                        Vorname <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="firstName"
                        placeholder="Max"
                        disabled={isSubmitting}
                        aria-invalid={!!errors.firstName}
                        {...register('firstName')}
                      />
                      {errors.firstName && (
                        <p className="text-xs text-destructive">{errors.firstName.message}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName">
                        Nachname <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="lastName"
                        placeholder="Mustermann"
                        disabled={isSubmitting}
                        aria-invalid={!!errors.lastName}
                        {...register('lastName')}
                      />
                      {errors.lastName && (
                        <p className="text-xs text-destructive">{errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Nickname */}
                  <div className="space-y-1.5">
                    <Label htmlFor="nickname">Spitzname</Label>
                    <Input
                      id="nickname"
                      placeholder="Clubname / Spitzname"
                      disabled={isSubmitting}
                      {...register('nickname')}
                    />
                  </div>
                </div>
              )}

              {/* Section 3: Name fields (LEGAL_ENTITY) */}
              {personType === 'LEGAL_ENTITY' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="organizationName">
                      Organisationsname <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="organizationName"
                      placeholder="Muster GmbH"
                      disabled={isSubmitting}
                      aria-invalid={!!errors.organizationName}
                      {...register('organizationName')}
                    />
                    {errors.organizationName && (
                      <p className="text-xs text-destructive">{errors.organizationName.message}</p>
                    )}
                  </div>

                  {/* Contact person fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="contactFirstName">Kontakt Vorname</Label>
                      <Input
                        id="contactFirstName"
                        placeholder="Max"
                        disabled={isSubmitting}
                        {...register('contactFirstName')}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contactLastName">Kontakt Nachname</Label>
                      <Input
                        id="contactLastName"
                        placeholder="Mustermann"
                        disabled={isSubmitting}
                        {...register('contactLastName')}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="department">Abteilung</Label>
                      <Input
                        id="department"
                        placeholder="Verwaltung"
                        disabled={isSubmitting}
                        {...register('department')}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        placeholder="Geschäftsführer"
                        disabled={isSubmitting}
                        {...register('position')}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="vatId">USt-IdNr.</Label>
                    <Input
                      id="vatId"
                      placeholder="DE123456789"
                      disabled={isSubmitting}
                      {...register('vatId')}
                    />
                  </div>

                  {/* Required name fields for member record */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName">
                        Vorname <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="firstName"
                        placeholder="Kontaktperson"
                        disabled={isSubmitting}
                        aria-invalid={!!errors.firstName}
                        {...register('firstName')}
                      />
                      {errors.firstName && (
                        <p className="text-xs text-destructive">{errors.firstName.message}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName">
                        Nachname <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="lastName"
                        placeholder="Kontaktperson"
                        disabled={isSubmitting}
                        aria-invalid={!!errors.lastName}
                        {...register('lastName')}
                      />
                      {errors.lastName && (
                        <p className="text-xs text-destructive">{errors.lastName.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Section 4: Member Number */}
              <div className="space-y-1.5">
                <Label htmlFor="memberNumber">Mitgliedsnummer</Label>
                <Input
                  id="memberNumber"
                  placeholder={memberNumberRange ? 'Wird automatisch vergeben' : 'MGL-001'}
                  disabled={isSubmitting}
                  {...register('memberNumber')}
                />
                {memberNumberRange && (
                  <p className="text-xs text-muted-foreground">
                    Wird automatisch vergeben, wenn leer gelassen.
                  </p>
                )}
                {errors.memberNumber && (
                  <p className="text-xs text-destructive">{errors.memberNumber.message}</p>
                )}
              </div>

              {/* Section 5: Status */}
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  defaultValue="PENDING"
                  disabled={isSubmitting}
                  onValueChange={(val) => setValue('status', val as FormValues['status'])}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Section 6: Join Date */}
              <div className="space-y-1.5">
                <Label>Eintrittsdatum</Label>
                <DateInput
                  value={joinDate}
                  onChange={(date) => setValue('joinDate', date, { shouldValidate: true })}
                  disabled={isSubmitting}
                  hasError={!!errors.joinDate}
                />
                {errors.joinDate?.message && (
                  <p className="text-xs text-destructive">{errors.joinDate.message}</p>
                )}
              </div>

              {/* Section 7: Membership Type (only shown when joinDate is set) */}
              {joinDate && (
                <div className="space-y-1.5">
                  <Label>Mitgliedsart</Label>
                  <Select
                    disabled={isSubmitting}
                    onValueChange={(val) =>
                      setValue('membershipType', val as FormValues['membershipType'])
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Mitgliedsart wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEMBERSHIP_TYPE_OPTIONS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Section 8: Address */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Adresse</Label>
                <AddressAutocomplete
                  register={register}
                  setValue={setValue}
                  watch={watch}
                  errors={errors as Record<string, { message?: string }>}
                  disabled={isSubmitting}
                />
              </div>

              {/* Section 9: Contact */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Kontakt</Label>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-Mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="max@example.de"
                      disabled={isSubmitting}
                      aria-invalid={!!errors.email}
                      {...register('email')}
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email.message}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Telefon</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="030 123456"
                        disabled={isSubmitting}
                        {...register('phone')}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="mobile">Mobil</Label>
                      <Input
                        id="mobile"
                        type="tel"
                        placeholder="0170 1234567"
                        disabled={isSubmitting}
                        {...register('mobile')}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fixed footer — always visible, never scrolls */}
          <div className="shrink-0 flex items-center justify-end gap-2 border-t bg-background px-4 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mitglied anlegen
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
