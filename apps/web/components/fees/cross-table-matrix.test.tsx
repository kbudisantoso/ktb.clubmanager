import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CrossTableEntryResponse } from '@ktb/shared';

// ----------------------------------------------------------------------------
// Hook mocks
// ----------------------------------------------------------------------------

const feeType = { id: 'ft-1', name: 'Einzelbeitrag', isActive: true };
const membershipType = { id: 'mt-1', name: 'Ordentliches Mitglied' };

let crossTableEntries: CrossTableEntryResponse[] = [];

vi.mock('@/hooks/use-fee-types', () => ({
  useFeeTypes: () => ({ data: [feeType], isLoading: false }),
}));

vi.mock('@/hooks/use-membership-types', () => ({
  useMembershipTypes: () => ({ data: [membershipType], isLoading: false }),
}));

const mockUpsertMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();

vi.mock('@/hooks/use-cross-table', () => ({
  useCrossTable: () => ({ data: crossTableEntries, isLoading: false }),
  useUpsertCrossTableEntry: () => ({
    mutateAsync: mockUpsertMutateAsync,
    isError: false,
  }),
  useDeleteCrossTableEntry: () => ({
    mutateAsync: mockDeleteMutateAsync,
    isError: false,
  }),
}));

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

import { CrossTableMatrix } from './cross-table-matrix';

function makeEntry(): CrossTableEntryResponse {
  return {
    id: 'entry-1',
    membershipTypeId: membershipType.id,
    feeTypeId: feeType.id,
    amount: '65.00',
    billingInterval: 'ANNUALLY',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

const cellLabel = `${membershipType.name} ${feeType.name} Betrag`;

describe('CrossTableMatrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsertMutateAsync.mockResolvedValue({});
    mockDeleteMutateAsync.mockResolvedValue(undefined);
    crossTableEntries = [];
  });

  /**
   * Regression WR-06: clearing an existing entry's amount and saving must call
   * the delete mutation with the entry id. Previously this branch only called
   * cancelEditing() and the row stayed billable.
   */
  it('deletes an existing entry when its amount is cleared and saved', async () => {
    crossTableEntries = [makeEntry()];
    const user = userEvent.setup();
    render(<CrossTableMatrix slug="tsv" />);

    // Enter edit mode on the populated cell.
    await user.click(screen.getByLabelText(cellLabel));
    const input = screen.getByLabelText(cellLabel) as HTMLInputElement;

    // Clear the amount and save via Enter.
    await user.clear(input);
    await user.keyboard('{Enter}');

    expect(mockDeleteMutateAsync).toHaveBeenCalledWith('entry-1');
    expect(mockUpsertMutateAsync).not.toHaveBeenCalled();
  });

  /**
   * WR-06: when no entry exists, clearing/saving an empty value is a no-op —
   * nothing to delete, nothing to upsert.
   */
  it('does not call delete when an empty cell is saved empty', async () => {
    crossTableEntries = [];
    const user = userEvent.setup();
    render(<CrossTableMatrix slug="tsv" />);

    await user.click(screen.getByLabelText(cellLabel));
    // Cell is now an empty editing input; saving without typing is a no-op.
    await user.keyboard('{Enter}');

    expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
    expect(mockUpsertMutateAsync).not.toHaveBeenCalled();
  });

  it('upserts when a valid amount is entered into an empty cell', async () => {
    crossTableEntries = [];
    const user = userEvent.setup();
    render(<CrossTableMatrix slug="tsv" />);

    await user.click(screen.getByLabelText(cellLabel));
    const input = screen.getByLabelText(cellLabel) as HTMLInputElement;

    await user.type(input, '50,00');
    await user.keyboard('{Enter}');

    expect(mockUpsertMutateAsync).toHaveBeenCalledWith({
      membershipTypeId: membershipType.id,
      feeTypeId: feeType.id,
      amount: '50.00',
      billingInterval: 'ANNUALLY',
    });
    expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
  });
});
