import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { memberKeys } from './use-members';

// ============================================================================
// Types
// ============================================================================

interface MemberDetail {
  id: string;
  clubId: string;
  memberNumber: string;
  personType: string;
  salutation: string | null;
  title: string | null;
  firstName: string;
  lastName: string;
  nickname: string | null;
  organizationName: string | null;
  contactFirstName: string | null;
  contactLastName: string | null;
  department: string | null;
  position: string | null;
  vatId: string | null;
  street: string | null;
  houseNumber: string | null;
  addressExtra: string | null;
  postalCode: string | null;
  city: string | null;
  country: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  notes: string | null;
  status: string;
  statusChangedAt: string | null;
  statusChangedBy: string | null;
  statusChangeReason: string | null;
  cancellationDate: string | null;
  cancellationReceivedAt: string | null;
  dsgvoRequestDate: string | null;
  anonymizedAt: string | null;
  anonymizedBy: string | null;
  userId: string | null;
  householdId: string | null;
  householdRole: string | null;
  household: {
    id: string;
    name: string;
    primaryContactId: string | null;
    members: {
      id: string;
      firstName: string;
      lastName: string;
      householdRole: string | null;
      memberNumber: string;
    }[];
  } | null;
  membershipPeriods: {
    id: string;
    joinDate: string | null;
    leaveDate: string | null;
    membershipType: string;
    notes: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  }[];
  deletedAt: string | null;
  deletedBy: string | null;
  deletionReason: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// ============================================================================
// Query Hook
// ============================================================================

/**
 * Fetch a single member with full details and relations.
 * Only queries when id is provided (enabled: !!id).
 */
export function useMember(slug: string, id: string | undefined) {
  return useQuery<MemberDetail>({
    queryKey: memberKeys.detail(slug, id ?? ''),
    queryFn: async () => {
      const res = await apiFetch(`/api/clubs/${slug}/members/${id}`);
      if (!res.ok) {
        throw new Error('Fehler beim Laden des Mitglieds');
      }
      return res.json();
    },
    enabled: !!id,
    staleTime: 60_000, // 1 minute for detail view
  });
}

export type { MemberDetail };
