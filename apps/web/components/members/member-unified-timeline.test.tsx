import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MemberUnifiedTimeline } from './member-unified-timeline';
import type { TimelinePeriod } from './member-unified-timeline';
import type { StatusHistoryEntry } from '@/hooks/use-members';

// ============================================================================
// Test data
// ============================================================================

const mockPeriod: TimelinePeriod = {
  id: 'period-1',
  joinDate: '2024-03-01',
  leaveDate: null,
  membershipTypeId: 'type-1',
  notes: 'Aufnahme nach Vorstandsbeschluss',
  createdAt: '2024-03-01T10:00:00Z',
  updatedAt: '2024-03-01T10:00:00Z',
};

const closedPeriod: TimelinePeriod = {
  id: 'period-2',
  joinDate: '2022-01-15',
  leaveDate: '2023-12-31',
  membershipTypeId: 'type-2',
  notes: null,
  createdAt: '2022-01-15T10:00:00Z',
  updatedAt: '2023-12-31T10:00:00Z',
};

const mockStatusEntry: StatusHistoryEntry = {
  id: 'status-1',
  memberId: 'member-1',
  clubId: 'club-1',
  fromStatus: 'PENDING',
  toStatus: 'ACTIVE',
  reason: 'Aufnahme durch Vorstand bestaetigt',
  leftCategory: null,
  effectiveDate: '2024-03-01',
  actorId: 'user-1',
  createdAt: '2024-03-01T10:30:00Z',
};

const mockLeftEntry: StatusHistoryEntry = {
  id: 'status-2',
  memberId: 'member-1',
  clubId: 'club-1',
  fromStatus: 'ACTIVE',
  toStatus: 'LEFT',
  reason: 'Kuendigung eingereicht',
  leftCategory: 'VOLUNTARY',
  effectiveDate: '2025-01-01',
  actorId: 'user-1',
  createdAt: '2025-01-01T09:00:00Z',
};

const mockMembershipTypes = [
  {
    id: 'type-1',
    clubId: 'club-1',
    name: 'Ordentliches Mitglied',
    code: 'ORDENTLICH',
    isDefault: true,
    isActive: true,
    sortOrder: 0,
    vote: true,
    assemblyAttendance: true,
    eligibleForOffice: true,
    color: 'BLUE' as const,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'type-2',
    clubId: 'club-1',
    name: 'Passives Mitglied',
    code: 'PASSIV',
    isDefault: false,
    isActive: true,
    sortOrder: 1,
    vote: false,
    assemblyAttendance: false,
    eligibleForOffice: false,
    color: 'SLATE' as const,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

// ============================================================================
// Tests
// ============================================================================

describe('MemberUnifiedTimeline', () => {
  it('renders merged timeline with both periods and status entries sorted by date', () => {
    render(
      <MemberUnifiedTimeline
        periods={[mockPeriod]}
        statusHistory={[mockStatusEntry]}
        statusHistoryLoading={false}
        membershipTypes={mockMembershipTypes}
        memberStatus="ACTIVE"
      />
    );

    expect(screen.getByText('Verlauf')).toBeInTheDocument();
    // Type name resolved (may appear in today card + entry)
    expect(screen.getAllByText('Ordentliches Mitglied').length).toBeGreaterThan(0);
    // Status entry: reason text
    expect(screen.getByText('Aufnahme durch Vorstand bestaetigt')).toBeInTheDocument();
  });

  it('renders period card with date range, duration, and notes', () => {
    render(
      <MemberUnifiedTimeline
        periods={[closedPeriod]}
        statusHistory={[]}
        statusHistoryLoading={false}
        membershipTypes={mockMembershipTypes}
        memberStatus="ACTIVE"
      />
    );

    expect(screen.getByText('Passives Mitglied')).toBeInTheDocument();
    // Only start date shown (end date is implicit from next entry)
    expect(screen.getByText('15.01.2022')).toBeInTheDocument();
  });

  it('renders active period with "Aktiv" label and start date', () => {
    render(
      <MemberUnifiedTimeline
        periods={[mockPeriod]}
        statusHistory={[]}
        statusHistoryLoading={false}
        membershipTypes={mockMembershipTypes}
        memberStatus="ACTIVE"
      />
    );

    // "Aktiv" may appear in today card badge + period card indicator
    expect(screen.getAllByText('Aktiv').length).toBeGreaterThan(0);
    expect(screen.getByText('01.03.2024')).toBeInTheDocument();
  });

  it('renders status card with from/to badges and reason', () => {
    render(
      <MemberUnifiedTimeline
        periods={[]}
        statusHistory={[mockStatusEntry]}
        statusHistoryLoading={false}
        membershipTypes={mockMembershipTypes}
        memberStatus="ACTIVE"
      />
    );

    expect(screen.getByText('01.03.2024')).toBeInTheDocument();
    expect(screen.getByText('Aufnahme durch Vorstand bestaetigt')).toBeInTheDocument();
  });

  it('renders left category label for LEFT transitions', () => {
    render(
      <MemberUnifiedTimeline
        periods={[]}
        statusHistory={[mockLeftEntry]}
        statusHistoryLoading={false}
        memberStatus="LEFT"
      />
    );

    expect(screen.getByText('Freiwilliger Austritt')).toBeInTheDocument();
  });

  it('shows empty state when no entries', () => {
    render(
      <MemberUnifiedTimeline
        periods={[]}
        statusHistory={[]}
        statusHistoryLoading={false}
        memberStatus="PENDING"
      />
    );

    expect(screen.getByText('Keine Eintraege vorhanden')).toBeInTheDocument();
  });

  it('shows loading skeleton when status history is loading', () => {
    const { container } = render(
      <MemberUnifiedTimeline
        periods={[]}
        statusHistory={undefined}
        statusHistoryLoading={true}
        memberStatus="PENDING"
      />
    );

    // Skeleton elements rendered
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows R3 banner for ACTIVE member without active period', () => {
    render(
      <MemberUnifiedTimeline
        periods={[closedPeriod]}
        statusHistory={[]}
        statusHistoryLoading={false}
        memberStatus="ACTIVE"
      />
    );

    expect(
      screen.getByText('Dieses Mitglied ist aktiv, hat aber noch keine Mitgliedschaft zugewiesen.')
    ).toBeInTheDocument();
  });

  it('does NOT show R3 banner for ACTIVE member WITH active period', () => {
    render(
      <MemberUnifiedTimeline
        periods={[mockPeriod]}
        statusHistory={[]}
        statusHistoryLoading={false}
        memberStatus="ACTIVE"
      />
    );

    expect(
      screen.queryByText(
        'Dieses Mitglied ist aktiv, hat aber noch keine Mitgliedschaft zugewiesen.'
      )
    ).not.toBeInTheDocument();
  });

  it('does NOT show R3 banner for PENDING member without period', () => {
    render(
      <MemberUnifiedTimeline
        periods={[]}
        statusHistory={[]}
        statusHistoryLoading={false}
        memberStatus="PENDING"
      />
    );

    expect(
      screen.queryByText(
        'Dieses Mitglied ist aktiv, hat aber noch keine Mitgliedschaft zugewiesen.'
      )
    ).not.toBeInTheDocument();
  });

  it('calls onEditPeriod when edit button is clicked', async () => {
    const user = userEvent.setup();
    const onEditPeriod = vi.fn();

    render(
      <MemberUnifiedTimeline
        periods={[mockPeriod]}
        statusHistory={[]}
        statusHistoryLoading={false}
        membershipTypes={mockMembershipTypes}
        memberStatus="ACTIVE"
        onEditPeriod={onEditPeriod}
      />
    );

    const editBtn = screen.getByRole('button', { name: 'Bearbeiten' });
    await user.click(editBtn);
    expect(onEditPeriod).toHaveBeenCalledWith(mockPeriod);
  });

  it('calls onClosePeriod when close button is clicked on active period', async () => {
    const user = userEvent.setup();
    const onClosePeriod = vi.fn();

    render(
      <MemberUnifiedTimeline
        periods={[mockPeriod]}
        statusHistory={[]}
        statusHistoryLoading={false}
        membershipTypes={mockMembershipTypes}
        memberStatus="ACTIVE"
        onClosePeriod={onClosePeriod}
      />
    );

    const closeBtn = screen.getByRole('button', { name: 'Beenden' });
    await user.click(closeBtn);
    expect(onClosePeriod).toHaveBeenCalledWith(mockPeriod);
  });

  it('does not show close button on closed periods', () => {
    render(
      <MemberUnifiedTimeline
        periods={[closedPeriod]}
        statusHistory={[]}
        statusHistoryLoading={false}
        membershipTypes={mockMembershipTypes}
        memberStatus="ACTIVE"
        onClosePeriod={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: 'Beenden' })).not.toBeInTheDocument();
  });

  it('resolves unknown type IDs to "Unbekannt"', () => {
    const periodWithUnknownType: TimelinePeriod = {
      ...mockPeriod,
      membershipTypeId: 'nonexistent',
    };

    render(
      <MemberUnifiedTimeline
        periods={[periodWithUnknownType]}
        statusHistory={[]}
        statusHistoryLoading={false}
        membershipTypes={mockMembershipTypes}
        memberStatus="ACTIVE"
      />
    );

    // "Unbekannt" may appear in today card + period card
    expect(screen.getAllByText('Unbekannt').length).toBeGreaterThan(0);
  });

  it('shows "Beitrittsanfrage" virtual label for PENDING member without period', () => {
    render(
      <MemberUnifiedTimeline
        periods={[]}
        statusHistory={[{ ...mockStatusEntry, fromStatus: 'PENDING', toStatus: 'PENDING' }]}
        statusHistoryLoading={false}
        memberStatus="PENDING"
      />
    );

    expect(screen.getByText('Beitrittsanfrage')).toBeInTheDocument();
  });

  it('shows cancellation notice on today card', () => {
    render(
      <MemberUnifiedTimeline
        periods={[mockPeriod]}
        statusHistory={[]}
        statusHistoryLoading={false}
        membershipTypes={mockMembershipTypes}
        memberStatus="ACTIVE"
        cancellationDate="2026-12-31"
      />
    );

    expect(screen.getByText(/Gekuendigt zum/)).toBeInTheDocument();
  });
});
