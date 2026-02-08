'use client';

import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form';
import { Info, User, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PersonTypeToggle } from '@/components/members/person-type-toggle';
import type { MemberDetail } from '@/hooks/use-member-detail';

// ============================================================================
// Constants
// ============================================================================

/** German labels for salutation */
const SALUTATION_LABELS: Record<string, string> = {
  HERR: 'Herr',
  FRAU: 'Frau',
  DIVERS: 'Divers',
};

const SALUTATION_OPTIONS = [
  { value: 'HERR', label: 'Herr' },
  { value: 'FRAU', label: 'Frau' },
  { value: 'DIVERS', label: 'Divers' },
] as const;

// ============================================================================
// Types
// ============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
interface BasicInfoTabProps {
  /** Full member data for read mode */
  member: MemberDetail;
  /** Whether the tab is in edit mode */
  isEditing: boolean;
  /** react-hook-form register */
  register: UseFormRegister<any>;
  /** react-hook-form control for Controller-based fields */
  control: Control<any>;
  /** react-hook-form setValue */
  setValue: UseFormSetValue<any>;
  /** react-hook-form watch */
  watch: UseFormWatch<any>;
  /** Form validation errors */
  errors: FieldErrors;
  /** Whether the form is submitting */
  disabled: boolean;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ============================================================================
// Component
// ============================================================================

/**
 * Stammdaten tab: Displays and edits basic member information.
 * In read mode, shows data in a clean grid. In edit mode, shows form fields.
 */
export function BasicInfoTab({
  member,
  isEditing,
  register,
  control,
  setValue,
  watch,
  errors,
  disabled,
}: BasicInfoTabProps) {
  if (!isEditing) {
    return <BasicInfoReadMode member={member} />;
  }

  return (
    <BasicInfoEditMode
      register={register}
      control={control}
      setValue={setValue}
      watch={watch}
      errors={errors}
      disabled={disabled}
      memberNumber={member.memberNumber}
    />
  );
}

// ============================================================================
// Read Mode
// ============================================================================

function BasicInfoReadMode({ member }: { member: MemberDetail }) {
  const isLegalEntity = member.personType === 'LEGAL_ENTITY';

  return (
    <div className="space-y-4">
      {/* Person type indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {isLegalEntity ? (
          <>
            <Building2 className="h-4 w-4" />
            <span>Juristische Person</span>
          </>
        ) : (
          <>
            <User className="h-4 w-4" />
            <span>Natuerliche Person</span>
          </>
        )}
      </div>

      {/* Data grid */}
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        {isLegalEntity ? (
          <>
            <ReadField label="Organisationsname" value={member.organizationName} />
            <ReadField label="Kontaktperson" value={formatContactPerson(member)} />
            <ReadField label="Abteilung" value={member.department} />
            <ReadField label="Position" value={member.position} />
            <ReadField label="USt-IdNr." value={member.vatId} />
          </>
        ) : (
          <>
            <ReadField
              label="Anrede"
              value={member.salutation ? SALUTATION_LABELS[member.salutation] : null}
            />
            <ReadField label="Titel" value={member.title} />
            <ReadField label="Vorname" value={member.firstName} />
            <ReadField label="Nachname" value={member.lastName} />
            <ReadField label="Spitzname" value={member.nickname} />
          </>
        )}

        {/* Member number (always shown) */}
        <ReadField label="Mitgliedsnummer" value={member.memberNumber} mono />

        {/* User link */}
        {member.userId && <ReadField label="Benutzerkonto" value="Verknuepft mit Benutzer" />}
      </dl>
    </div>
  );
}

function ReadField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <>
      <dt className="text-muted-foreground whitespace-nowrap">{label}</dt>
      <dd className={mono ? 'font-mono' : ''}>
        {value || <span className="text-muted-foreground/50">Nicht angegeben</span>}
      </dd>
    </>
  );
}

function formatContactPerson(member: MemberDetail): string | null {
  const parts = [member.contactFirstName, member.contactLastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

// ============================================================================
// Edit Mode
// ============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
interface EditModeProps {
  register: UseFormRegister<any>;
  control: Control<any>;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
  errors: FieldErrors;
  disabled: boolean;
  memberNumber: string;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function BasicInfoEditMode({
  register,
  control,
  setValue,
  watch,
  errors,
  disabled,
  memberNumber,
}: EditModeProps) {
  const personType = watch('personType') ?? 'NATURAL';
  const isLegalEntity = personType === 'LEGAL_ENTITY';

  return (
    <div className="space-y-4">
      {/* Person Type Toggle */}
      <div className="space-y-2">
        <Label>Personenart</Label>
        <PersonTypeToggle control={control} disabled={disabled} />
      </div>

      {/* Natural person fields */}
      {!isLegalEntity && (
        <div className="space-y-3">
          {/* Salutation + Title */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-salutation">Anrede</Label>
              <Select
                defaultValue={watch('salutation') ?? undefined}
                disabled={disabled}
                onValueChange={(val) => setValue('salutation', val, { shouldDirty: true })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Bitte waehlen" />
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
              <Label htmlFor="edit-title">Titel</Label>
              <Input
                id="edit-title"
                placeholder="Dr., Prof."
                disabled={disabled}
                {...register('title')}
              />
            </div>
          </div>

          {/* First + Last name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-firstName">
                Vorname <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-firstName"
                placeholder="Max"
                disabled={disabled}
                aria-invalid={!!errors.firstName}
                {...register('firstName')}
              />
              {errors.firstName?.message && (
                <p className="text-xs text-destructive">{String(errors.firstName.message)}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-lastName">
                Nachname <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-lastName"
                placeholder="Mustermann"
                disabled={disabled}
                aria-invalid={!!errors.lastName}
                {...register('lastName')}
              />
              {errors.lastName?.message && (
                <p className="text-xs text-destructive">{String(errors.lastName.message)}</p>
              )}
            </div>
          </div>

          {/* Nickname */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-nickname">Spitzname</Label>
            <Input
              id="edit-nickname"
              placeholder="Clubname / Spitzname"
              disabled={disabled}
              {...register('nickname')}
            />
          </div>
        </div>
      )}

      {/* Legal entity fields */}
      {isLegalEntity && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-organizationName">
              Organisationsname <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-organizationName"
              placeholder="Muster GmbH"
              disabled={disabled}
              aria-invalid={!!errors.organizationName}
              {...register('organizationName')}
            />
            {errors.organizationName?.message && (
              <p className="text-xs text-destructive">{String(errors.organizationName.message)}</p>
            )}
          </div>

          {/* Contact person */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-contactFirstName">Kontakt Vorname</Label>
              <Input
                id="edit-contactFirstName"
                placeholder="Max"
                disabled={disabled}
                {...register('contactFirstName')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-contactLastName">Kontakt Nachname</Label>
              <Input
                id="edit-contactLastName"
                placeholder="Mustermann"
                disabled={disabled}
                {...register('contactLastName')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-department">Abteilung</Label>
              <Input
                id="edit-department"
                placeholder="Verwaltung"
                disabled={disabled}
                {...register('department')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-position">Position</Label>
              <Input
                id="edit-position"
                placeholder="Geschaeftsfuehrer"
                disabled={disabled}
                {...register('position')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-vatId">USt-IdNr.</Label>
            <Input
              id="edit-vatId"
              placeholder="DE123456789"
              disabled={disabled}
              {...register('vatId')}
            />
          </div>

          {/* Required name fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-firstName">
                Vorname <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-firstName"
                placeholder="Kontaktperson"
                disabled={disabled}
                aria-invalid={!!errors.firstName}
                {...register('firstName')}
              />
              {errors.firstName?.message && (
                <p className="text-xs text-destructive">{String(errors.firstName.message)}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-lastName">
                Nachname <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-lastName"
                placeholder="Kontaktperson"
                disabled={disabled}
                aria-invalid={!!errors.lastName}
                {...register('lastName')}
              />
              {errors.lastName?.message && (
                <p className="text-xs text-destructive">{String(errors.lastName.message)}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Member number (always read-only in edit mode) */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Label>Mitgliedsnummer</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Mitgliedsnummer kann nach Erstellung nicht geaendert werden</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input value={memberNumber} disabled className="font-mono bg-muted" />
      </div>
    </div>
  );
}
