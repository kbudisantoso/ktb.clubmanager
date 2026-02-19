'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  MoreHorizontal,
  Users,
  Calendar,
  Trash2,
  ShieldAlert,
  Link2,
  Mail,
  Phone,
} from 'lucide-react';
import type { MemberStatus, NamedTransition } from '@ktb/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMembershipTypes } from '@/hooks/use-membership-types';
import { useMemberStatusHistory } from '@/hooks/use-members';
import { MemberAvatar } from './member-avatar';
import { MemberStatusBadge } from './member-status-badge';
import { HouseholdBadge } from './household-badge';
import { useCanManageUsers } from '@/lib/club-permissions';
import { buildTransitionActions, CANCELLATION_STATUSES } from './member-status-actions';
import type { MemberDetail } from '@/hooks/use-member-detail';

interface MemberDetailHeaderProps {
  /** Full member data */
  member: MemberDetail;
  /** Called when a status transition is selected */
  onTransition?: (targetStatus: MemberStatus, namedTransition: NamedTransition) => void;
  /** Called when "Kündigung erfassen" is selected */
  onRecordCancellation?: () => void;
  /** Called when "Kündigung widerrufen" is selected */
  onRevokeCancellation?: () => void;
  /** Called when "Haushalt zuordnen" is clicked */
  onAssignHousehold?: () => void;
  /** Called when "Benutzerkonto verknüpfen" is clicked */
  onLinkUser?: () => void;
  /** Called when "Löschen" is clicked */
  onDelete?: () => void;
  /** Called when "Anonymisieren" is clicked */
  onAnonymize?: () => void;
}

/**
 * Member detail header with avatar, name, status, and action dropdown.
 * Used in the member detail Sheet overlay.
 */
export function MemberDetailHeader({
  member,
  onTransition,
  onRecordCancellation,
  onRevokeCancellation,
  onAssignHousehold,
  onLinkUser,
  onDelete,
  onAnonymize,
}: MemberDetailHeaderProps) {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { data: membershipTypes } = useMembershipTypes(slug);
  const canManageUsers = useCanManageUsers();

  const displayName = useMemo(() => {
    if (member.personType === 'LEGAL_ENTITY' && member.organizationName) {
      return member.organizationName;
    }
    return `${member.lastName}, ${member.firstName}`;
  }, [member.personType, member.organizationName, member.lastName, member.firstName]);

  // Get the relevant membership period for display:
  // - Active members: period containing today
  // - LEFT members: last period before exit (not a future-dated period)
  const activePeriod = useMemo(() => {
    if (!member.membershipPeriods?.length) return null;
    const today = new Date().toISOString().slice(0, 10);
    // Period containing today: joinDate <= today AND (leaveDate > today OR open)
    const current = member.membershipPeriods.find(
      (p) => (p.joinDate ?? '') <= today && (!p.leaveDate || p.leaveDate > today)
    );
    if (current) return current;
    // Fall back: most recent period that started on or before today
    const pastPeriods = member.membershipPeriods
      .filter((p) => (p.joinDate ?? '') <= today)
      .sort((a, b) => (b.joinDate ?? '').localeCompare(a.joinDate ?? ''));
    if (pastPeriods.length > 0) return pastPeriods[0];
    // Last resort: earliest period (member never had a past period)
    return [...member.membershipPeriods].sort((a, b) =>
      (a.joinDate ?? '').localeCompare(b.joinDate ?? '')
    )[0];
  }, [member.membershipPeriods]);

  const membershipTypeName = useMemo(() => {
    if (!activePeriod?.membershipTypeId || !membershipTypes) return null;
    const found = membershipTypes.find((t) => t.id === activePeriod.membershipTypeId);
    return found?.name ?? null;
  }, [activePeriod?.membershipTypeId, membershipTypes]);

  // "seit" date: when the current membership type period started
  const typeSinceDate = activePeriod?.joinDate ? formatDate(activePeriod.joinDate) : null;

  // Fetch status history for Eintritt/Austritt computation
  const { data: statusHistory } = useMemberStatusHistory(slug, member.id);

  // "Eintritt": oldest transition to ACTIVE
  const clubEntryDate = useMemo(() => {
    if (!statusHistory?.length) return null;
    // statusHistory is DESC from API — find the last (= oldest) ACTIVE transition
    const activeTransitions = statusHistory.filter((t) => t.toStatus === 'ACTIVE');
    const oldest = activeTransitions[activeTransitions.length - 1];
    return oldest?.effectiveDate ?? null;
  }, [statusHistory]);

  // "Austritt": any terminal (LEFT) transition, or cancellationDate as planned exit
  const exitDate = useMemo(() => {
    if (statusHistory?.length) {
      const leftTransition = statusHistory.find((t) => t.toStatus === 'LEFT');
      if (leftTransition) return leftTransition.effectiveDate;
    }
    return member.cancellationDate ?? null;
  }, [statusHistory, member.cancellationDate]);

  const isLeft = member.status === 'LEFT';
  const hasCancellation = !!member.cancellationDate && member.status !== 'LEFT';

  // Status action items for the dropdown
  const currentStatus = member.status as MemberStatus;
  const { primary, selfTransition, secondary, destructive } = buildTransitionActions(currentStatus);
  const hasCancellationRecord = !!member.cancellationDate;
  const canRecordCancellation = CANCELLATION_STATUSES.includes(member.status);
  const hasActivePeriod = member.membershipPeriods?.some((p) => !p.leaveDate) ?? false;
  const showSelfTransition = selfTransition && hasActivePeriod;

  const hasStatusItems =
    primary ||
    showSelfTransition ||
    secondary.length > 0 ||
    destructive.length > 0 ||
    canRecordCancellation ||
    hasCancellationRecord;

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
          imageUrl={member.userImage}
        />

        <div className="min-w-0 space-y-1">
          {/* Name */}
          <h2 className="text-lg font-semibold truncate">{displayName}</h2>

          {/* Status + Member number + Cancellation badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <MemberStatusBadge status={member.status} />
            {hasCancellation && (
              <Badge variant="outline" className="border-warning/25 text-warning-foreground">
                Gekündigt zum {formatDate(member.cancellationDate ?? '')}
              </Badge>
            )}
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

          {/* Membership type + seit / bis / beantragt */}
          {membershipTypeName && (
            <div className="text-sm text-muted-foreground">
              {membershipTypeName}
              {isLeft && exitDate ? (
                <> bis {formatDate(exitDate)}</>
              ) : member.status === 'PENDING' && typeSinceDate ? (
                <> (beantragt am {typeSinceDate})</>
              ) : (
                typeSinceDate && <> seit {typeSinceDate}</>
              )}
            </div>
          )}

          {/* Eintritt + Austritt */}
          {(clubEntryDate || exitDate) && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
              {clubEntryDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Eintritt: {formatDate(clubEntryDate)}
                </span>
              )}
              {exitDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Austritt: {formatDate(exitDate)}
                </span>
              )}
            </div>
          )}

          {/* Contact info — clickable links */}
          {(member.email || member.phone || member.mobile) && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
              {member.email && (
                <a
                  href={`mailto:${member.email}`}
                  className="flex items-center gap-1 hover:text-foreground transition-colors truncate"
                >
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{member.email}</span>
                </a>
              )}
              {(member.phone || member.mobile) && (
                <a
                  href={`tel:${member.mobile || member.phone}`}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <Phone className="h-3 w-3 shrink-0" />
                  <span>{member.mobile || member.phone}</span>
                </a>
              )}
            </div>
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
            {/* Status transitions */}
            {primary && onTransition && (
              <DropdownMenuItem onClick={() => onTransition(primary.target, primary.transition)}>
                {primary.transition.action}
              </DropdownMenuItem>
            )}
            {showSelfTransition && onTransition && (
              <DropdownMenuItem
                onClick={() => onTransition(selfTransition.target, selfTransition.transition)}
              >
                {selfTransition.transition.action}
              </DropdownMenuItem>
            )}
            {secondary.map(({ target, transition }) => (
              <DropdownMenuItem key={target} onClick={() => onTransition?.(target, transition)}>
                {transition.action}
              </DropdownMenuItem>
            ))}

            {/* Cancellation section */}
            {canRecordCancellation && !hasCancellationRecord && onRecordCancellation && (
              <>
                {(primary || showSelfTransition || secondary.length > 0) && (
                  <DropdownMenuSeparator />
                )}
                <DropdownMenuItem onClick={onRecordCancellation}>
                  Kündigung erfassen
                </DropdownMenuItem>
              </>
            )}
            {hasCancellationRecord && (
              <>
                {(primary || showSelfTransition || secondary.length > 0) && (
                  <DropdownMenuSeparator />
                )}
                <div className="px-2 py-1.5 text-xs text-warning-foreground">
                  Kündigung zum {formatDate(member.cancellationDate ?? '')}
                </div>
                {onRevokeCancellation && (
                  <DropdownMenuItem onClick={onRevokeCancellation}>
                    Kündigung widerrufen
                  </DropdownMenuItem>
                )}
              </>
            )}

            {/* Destructive status transitions */}
            {destructive.length > 0 && onTransition && (
              <>
                <DropdownMenuSeparator />
                {destructive.map(({ target, transition }) => (
                  <DropdownMenuItem
                    key={target}
                    variant="destructive"
                    onClick={() => onTransition(target, transition)}
                  >
                    {transition.action}
                  </DropdownMenuItem>
                ))}
              </>
            )}

            {/* Admin actions */}
            {hasStatusItems && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={onAssignHousehold}>
              <Users className="h-4 w-4" />
              {member.household ? 'Haushalt bearbeiten' : 'Haushalt zuordnen'}
            </DropdownMenuItem>
            {canManageUsers && (
              <DropdownMenuItem onClick={onLinkUser}>
                <Link2 className="h-4 w-4" />
                {member.userId ? 'Benutzerkonto bearbeiten' : 'Benutzerkonto verknüpfen'}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
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
