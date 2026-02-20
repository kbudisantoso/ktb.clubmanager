'use client';

import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Mail, Phone, Smartphone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AddressAutocomplete } from '@/components/members/address-autocomplete';
import type { MemberDetail } from '@/hooks/use-member-detail';

// ============================================================================
// Constants
// ============================================================================

/** Country code to German label mapping */
const COUNTRY_LABELS: Record<string, string> = {
  DE: 'Deutschland',
  AT: 'Österreich',
  CH: 'Schweiz',
  LU: 'Luxemburg',
};

// ============================================================================
// Types
// ============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
interface AddressContactSectionProps {
  /** Full member data for read mode */
  member: MemberDetail;
  /** Whether the tab is in edit mode */
  isEditing: boolean;
  /** react-hook-form register */
  register: UseFormRegister<any>;
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
 * Adresse & Kontakt tab: Displays and edits address and contact information.
 * Read mode shows formatted address block with clickable contact links.
 * Edit mode shows AddressAutocomplete with OpenPLZ integration and contact inputs.
 */
export function AddressContactSection({
  member,
  isEditing,
  register,
  setValue,
  watch,
  errors,
  disabled,
}: AddressContactSectionProps) {
  if (!isEditing) {
    return <AddressContactReadMode member={member} />;
  }

  return (
    <AddressContactEditMode
      register={register}
      setValue={setValue}
      watch={watch}
      errors={errors}
      disabled={disabled}
    />
  );
}

// ============================================================================
// Read Mode
// ============================================================================

function AddressContactReadMode({ member }: { member: MemberDetail }) {
  const hasAddress = member.street || member.postalCode || member.city;
  const showCountry = member.country && member.country !== 'DE';

  return (
    <div className="space-y-6">
      {/* Address block */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Adresse</h3>
        {hasAddress ? (
          <div className="text-sm space-y-0.5">
            {(member.street || member.houseNumber) && (
              <p>{[member.street, member.houseNumber].filter(Boolean).join(' ')}</p>
            )}
            {member.addressExtra && <p className="text-muted-foreground">{member.addressExtra}</p>}
            {(member.postalCode || member.city) && (
              <p>{[member.postalCode, member.city].filter(Boolean).join(' ')}</p>
            )}
            {showCountry && <p>{COUNTRY_LABELS[member.country] ?? member.country}</p>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground/50">Keine Adresse angegeben</p>
        )}
      </div>

      {/* Separator */}
      <div className="border-t" />

      {/* Contact information */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Kontakt</h3>
        <dl className="space-y-2 text-sm">
          <ContactField
            icon={<Mail className="h-4 w-4" />}
            label="E-Mail"
            value={member.email}
            href={member.email ? `mailto:${member.email}` : undefined}
          />
          <ContactField
            icon={<Phone className="h-4 w-4" />}
            label="Telefon"
            value={member.phone}
            href={member.phone ? `tel:${member.phone}` : undefined}
          />
          <ContactField
            icon={<Smartphone className="h-4 w-4" />}
            label="Mobil"
            value={member.mobile}
            href={member.mobile ? `tel:${member.mobile}` : undefined}
          />
        </dl>
      </div>
    </div>
  );
}

function ContactField({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  href?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-muted-foreground shrink-0 w-16">{label}</span>
      {value ? (
        href ? (
          <a href={href} className="text-primary hover:underline truncate">
            {value}
          </a>
        ) : (
          <span className="truncate">{value}</span>
        )
      ) : (
        <span className="text-muted-foreground/50">Nicht angegeben</span>
      )}
    </div>
  );
}

// ============================================================================
// Edit Mode
// ============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
interface EditModeProps {
  register: UseFormRegister<any>;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
  errors: FieldErrors;
  disabled: boolean;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function AddressContactEditMode({ register, setValue, watch, errors, disabled }: EditModeProps) {
  return (
    <div className="space-y-6">
      {/* Address section with autocomplete */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Adresse</h3>
        <AddressAutocomplete
          register={register}
          setValue={setValue}
          watch={watch}
          errors={errors as Record<string, { message?: string }>}
          disabled={disabled}
        />
      </div>

      {/* Separator */}
      <div className="border-t" />

      {/* Contact fields */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Kontakt</h3>

        <div className="space-y-1.5">
          <Label htmlFor="edit-email">E-Mail</Label>
          <Input
            id="edit-email"
            type="email"
            placeholder="max@example.de"
            disabled={disabled}
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email?.message && (
            <p className="text-xs text-destructive">{String(errors.email.message)}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-phone">Telefon</Label>
            <Input
              id="edit-phone"
              type="tel"
              placeholder="030 123456"
              disabled={disabled}
              {...register('phone')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-mobile">Mobil</Label>
            <Input
              id="edit-mobile"
              type="tel"
              placeholder="0170 1234567"
              disabled={disabled}
              {...register('mobile')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
