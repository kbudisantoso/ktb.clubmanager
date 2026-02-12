'use client';

import { useMemo } from 'react';
import {
  MoreHorizontal,
  RefreshCw,
  Users,
  UserX,
  Calendar,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MemberAvatar } from './member-avatar';
import { MemberStatusBadge } from './member-status-badge';
import { HouseholdBadge } from './household-badge';
import type { MemberDetail } from '@/hooks/use-member-detail';

/** Membership type German labels */
const MEMBERSHIP_TYPE_LABELS: Record<string, string> = {
  ORDENTLICH: 'Ordentlich',
  PASSIV: 'Passiv',
  EHREN: 'Ehren',
  FOERDER: 'Förder',
  JUGEND: 'Jugend',
};

interface MemberDetailHeaderProps {
  /** Full member data */
  member: MemberDetail;
  /** Called when "Status ändern" is clicked */
  onChangeStatus?: () => void;
  /** Called when "Haushalt zuordnen" is clicked */
  onAssignHousehold?: () => void;
  /** Called when "Mitgliedschaft beenden" is clicked */
  onEndMembership?: () => void;
  /** Called when "Kündigung erfassen" is clicked */
  onRecordCancellation?: () => void;
  /** Called when "Löschen" is clicked */
  onDelete?: () => void;
  /** Called when "Anonymisieren" is clicked */
  onAnonymize?: () => void;
}

/**
 * Member detail header with avatar, name, status, and action dropdown.
 * Used in the resizable side panel and mobile sheet.
 */
export function MemberDetailHeader({
  member,
  onChangeStatus,
  onAssignHousehold,
  onEndMembership,
  onRecordCancellation,
  onDelete,
  onAnonymize,
}: MemberDetailHeaderProps) {
  const displayName = useMemo(() => {
    if (member.personType === 'LEGAL_ENTITY' && member.organizationName) {
      return member.organizationName;
    }
    return `${member.lastName}, ${member.firstName}`;
  }, [member.personType, member.organizationName, member.lastName, member.firstName]);

  // Get active membership period
  const activePeriod = useMemo(() => {
    if (!member.membershipPeriods?.length) return null;
    const current = member.membershipPeriods.find((p) => !p.leaveDate);
    if (current) return current;
    // Fall back to most recent
    return [...member.membershipPeriods].sort((a, b) => {
      const dateA = a.joinDate ?? '';
      const dateB = b.joinDate ?? '';
      return dateB.localeCompare(dateA);
    })[0];
  }, [member.membershipPeriods]);

  const entryDate = activePeriod?.joinDate ? formatDate(activePeriod.joinDate) : null;
  const membershipType = activePeriod?.membershipType
    ? (MEMBERSHIP_TYPE_LABELS[activePeriod.membershipType] ?? activePeriod.membershipType)
    : null;

  const isLeft = member.status === 'LEFT';
  const contactInfo = [member.email, member.phone || member.mobile].filter(Boolean);

  return (
    <div className="flex items-start justify-between gap-4">
      {/* Left: Avatar + info */}
      <div className="flex items-start gap-3 min-w-0">
        <MemberAvatar
          memberId={member.id}
          firstName={member.firstName}
          lastName={member.lastName}
          organizationName={member.organizationName}
          personType={member.personType}
          size="md"
        />

        <div className="min-w-0 space-y-1">
          {/* Name */}
          <h2 className="text-lg font-semibold truncate">{displayName}</h2>

          {/* Status + Member number */}
          <div className="flex items-center gap-2 flex-wrap">
            <MemberStatusBadge status={member.status} />
            <span className="text-sm text-muted-foreground font-mono">{member.memberNumber}</span>
            {member.household && (
              <HouseholdBadge
                name={member.household.name}
                householdId={member.household.id}
                members={member.household.members}
                onClick={onAssignHousehold}
              />
            )}
          </div>

          {/* Membership type + Entry date */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            {membershipType && <span>{membershipType}</span>}
            {entryDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Eintritt: {entryDate}
              </span>
            )}
          </div>

          {/* Contact info */}
          {contactInfo.length > 0 && (
            <div className="text-sm text-muted-foreground truncate">{contactInfo.join(' | ')}</div>
          )}
        </div>
      </div>

      {/* Right: Action dropdown */}
      <div className="shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Mehr Aktionen</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {member.status !== 'LEFT' && (
              <DropdownMenuItem onClick={onChangeStatus}>
                <RefreshCw className="h-4 w-4" />
                Status ändern
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onAssignHousehold}>
              <Users className="h-4 w-4" />
              {member.household ? 'Haushalt bearbeiten' : 'Haushalt zuordnen'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEndMembership}>
              <UserX className="h-4 w-4" />
              Mitgliedschaft beenden
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onRecordCancellation}>
              <Calendar className="h-4 w-4" />
              Kündigung erfassen
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" disabled={!isLeft} onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
              Löschen
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" disabled={!isLeft} onClick={onAnonymize}>
              <ShieldAlert className="h-4 w-4" />
              Anonymisieren
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/**
 * Format an ISO date string to German DD.MM.YYYY format.
 */
function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}.${month}.${year}`;
}
