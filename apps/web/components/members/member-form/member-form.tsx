'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { UpdateMemberSchema } from '@ktb/shared';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useUpdateMember } from '@/hooks/use-members';
import { useToast } from '@/hooks/use-toast';
import type { MemberDetail } from '@/hooks/use-member-detail';
import { BasicInfoTab } from './basic-info-tab';
import { AddressContactTab } from './address-contact-tab';
import { MembershipTab } from './membership-tab';
import { NotesTab } from './notes-tab';

// ============================================================================
// Constants
// ============================================================================

/** Tab definitions */
const TABS = [
  { value: 'stammdaten', label: 'Stammdaten' },
  { value: 'adresse', label: 'Adresse & Kontakt' },
  { value: 'mitgliedschaft', label: 'Mitgliedschaft' },
  { value: 'notizen', label: 'Notizen' },
] as const;

type TabValue = (typeof TABS)[number]['value'];

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
  /** Whether to use compact layout (panel) vs full layout (page) */
  compact?: boolean;
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
 * Member form wrapper with section-level edit mode.
 * Each tab can be independently toggled between read and edit mode.
 * Dirty form protection shows a dialog when switching tabs with unsaved changes.
 */
export function MemberForm({ member, slug, compact = false, onChangeStatus }: MemberFormProps) {
  const { toast } = useToast();
  const updateMember = useUpdateMember(slug);
  const [editingTab, setEditingTab] = useState<TabValue | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>('stammdaten');
  const [dirtyDialogState, setDirtyDialogState] = useState<{
    open: boolean;
    targetTab: TabValue | null;
  }>({ open: false, targetTab: null });

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
    if (!editingTab) {
      reset(memberToFormValues(member));
    }
  }, [member, editingTab, reset]);

  // ============================================================================
  // Tab switching with dirty protection
  // ============================================================================

  const handleTabChange = useCallback(
    (newTab: string) => {
      const target = newTab as TabValue;

      // If currently editing and form is dirty, show confirmation
      if (editingTab && isDirty) {
        setDirtyDialogState({ open: true, targetTab: target });
        return;
      }

      // If currently editing but not dirty, just exit edit mode
      if (editingTab) {
        setEditingTab(null);
        reset(defaultValues);
      }

      setActiveTab(target);
    },
    [editingTab, isDirty, reset, defaultValues]
  );

  const handleDiscardAndSwitch = useCallback(() => {
    const target = dirtyDialogState.targetTab;
    setEditingTab(null);
    reset(defaultValues);
    setDirtyDialogState({ open: false, targetTab: null });
    if (target) {
      setActiveTab(target);
    }
  }, [dirtyDialogState.targetTab, reset, defaultValues]);

  // ============================================================================
  // Edit mode handlers
  // ============================================================================

  const startEditing = useCallback(
    (tab: TabValue) => {
      reset(memberToFormValues(member));
      setEditingTab(tab);
    },
    [reset, member]
  );

  const cancelEditing = useCallback(() => {
    reset(defaultValues);
    setEditingTab(null);
  }, [reset, defaultValues]);

  const onSubmit = useCallback(
    async (data: FormValues) => {
      try {
        // Only send changed fields
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
          setEditingTab(null);
          return;
        }

        await updateMember.mutateAsync({ id: member.id, ...changed });
        toast({ title: 'Aenderungen gespeichert' });
        setEditingTab(null);
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

  const isEditing = (tab: TabValue) => editingTab === tab;

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          {!compact && (
            <TabsList variant="line" className="w-full justify-start mb-4">
              {TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          )}

          {compact && (
            <div className="px-4 pt-2 border-b">
              <TabsList variant="line" className="w-full justify-start">
                {TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          )}

          <div className={compact ? 'p-4' : 'mt-4'}>
            {/* Stammdaten Tab */}
            <TabsContent value="stammdaten">
              <TabWrapper
                isEditing={isEditing('stammdaten')}
                isSubmitting={isSubmitting}
                onEdit={() => startEditing('stammdaten')}
                onCancel={cancelEditing}
              >
                <BasicInfoTab
                  member={member}
                  isEditing={isEditing('stammdaten')}
                  register={register}
                  control={control}
                  setValue={setValue}
                  watch={watch}
                  errors={errors}
                  disabled={isSubmitting}
                />
              </TabWrapper>
            </TabsContent>

            {/* Adresse & Kontakt Tab */}
            <TabsContent value="adresse">
              <TabWrapper
                isEditing={isEditing('adresse')}
                isSubmitting={isSubmitting}
                onEdit={() => startEditing('adresse')}
                onCancel={cancelEditing}
              >
                <AddressContactTab
                  member={member}
                  isEditing={isEditing('adresse')}
                  register={register}
                  setValue={setValue}
                  watch={watch}
                  errors={errors}
                  disabled={isSubmitting}
                />
              </TabWrapper>
            </TabsContent>

            {/* Mitgliedschaft Tab */}
            <TabsContent value="mitgliedschaft">
              <MembershipTab member={member} slug={slug} onChangeStatus={onChangeStatus} />
            </TabsContent>

            {/* Notizen Tab */}
            <TabsContent value="notizen">
              <TabWrapper
                isEditing={isEditing('notizen')}
                isSubmitting={isSubmitting}
                onEdit={() => startEditing('notizen')}
                onCancel={cancelEditing}
              >
                <NotesTab
                  member={member}
                  isEditing={isEditing('notizen')}
                  register={register}
                  watch={watch}
                  disabled={isSubmitting}
                />
              </TabWrapper>
            </TabsContent>
          </div>
        </Tabs>
      </form>

      {/* Dirty form protection dialog */}
      <AlertDialog
        open={dirtyDialogState.open}
        onOpenChange={(open) => {
          if (!open) setDirtyDialogState({ open: false, targetTab: null });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ungespeicherte Aenderungen</AlertDialogTitle>
            <AlertDialogDescription>
              Moechtest du die Aenderungen verwerfen? Nicht gespeicherte Daten gehen verloren.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardAndSwitch}>Verwerfen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============================================================================
// Tab Wrapper: Edit mode toolbar
// ============================================================================

interface TabWrapperProps {
  isEditing: boolean;
  isSubmitting: boolean;
  onEdit: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}

/**
 * Wrapper that adds "Bearbeiten" / "Speichern" / "Abbrechen" toolbar to a tab.
 */
function TabWrapper({ isEditing, isSubmitting, onEdit, onCancel, children }: TabWrapperProps) {
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2">
        {isEditing ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Abbrechen
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            Bearbeiten
          </Button>
        )}
      </div>

      {/* Tab content */}
      {children}
    </div>
  );
}
