'use client';

import type { UseFormRegister, UseFormWatch } from 'react-hook-form';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { MemberDetail } from '@/hooks/use-member-detail';

// ============================================================================
// Constants
// ============================================================================

const MAX_NOTES_LENGTH = 5000;

// ============================================================================
// Types
// ============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
interface NotesSectionProps {
  /** Full member data for read mode */
  member: MemberDetail;
  /** Whether the tab is in edit mode */
  isEditing: boolean;
  /** react-hook-form register */
  register: UseFormRegister<any>;
  /** react-hook-form watch for character counter */
  watch: UseFormWatch<any>;
  /** Whether the form is submitting */
  disabled: boolean;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ============================================================================
// Component
// ============================================================================

/**
 * Notizen tab: Displays and edits free text notes.
 * Read mode preserves whitespace and shows last edit timestamp.
 * Edit mode shows a textarea with character counter and auto-resize.
 */
export function NotesSection({ member, isEditing, register, watch, disabled }: NotesSectionProps) {
  if (!isEditing) {
    return <NotesReadMode member={member} />;
  }

  return <NotesEditMode register={register} watch={watch} disabled={disabled} />;
}

// ============================================================================
// Read Mode
// ============================================================================

function NotesReadMode({ member }: { member: MemberDetail }) {
  const hasNotes = member.notes && member.notes.trim().length > 0;

  return (
    <div className="space-y-2">
      {hasNotes ? (
        <>
          <div className="text-sm whitespace-pre-wrap rounded-md border p-3 min-h-[100px]">
            {member.notes}
          </div>
          {member.updatedAt && (
            <p className="text-xs text-muted-foreground">
              Zuletzt bearbeitet: {formatTimestamp(member.updatedAt)}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground/50 py-4">Keine Notizen vorhanden</p>
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
  watch: UseFormWatch<any>;
  disabled: boolean;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function NotesEditMode({ register, watch, disabled }: EditModeProps) {
  const notesValue = watch('notes') ?? '';
  const charCount = notesValue.length;

  return (
    <div className="space-y-2">
      <Label htmlFor="edit-notes">Notizen</Label>
      <Textarea
        id="edit-notes"
        placeholder="Freitext-Notizen zum Mitglied..."
        disabled={disabled}
        className="min-h-[200px] resize-y"
        maxLength={MAX_NOTES_LENGTH}
        {...register('notes')}
      />
      <p className="text-xs text-muted-foreground text-right">
        {charCount} / {MAX_NOTES_LENGTH} Zeichen
      </p>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format an ISO datetime string to German format: DD.MM.YYYY HH:MM
 */
function formatTimestamp(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } catch {
    return isoDate;
  }
}
