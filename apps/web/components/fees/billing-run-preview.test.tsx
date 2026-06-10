import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import type { BillingRunPreviewResponse } from '@ktb/shared';

import { BillingRunPreview } from './billing-run-preview';

// A breakdown row may carry a `kind` discriminator added by the backend
// (WR-04). The shared type does not yet declare it, so the tests construct
// rows with the field and cast to the prop type.
type BreakdownRow = {
  membershipType: string;
  count: number;
  subtotal: string;
  kind?: 'membershipType' | 'category';
};

function makeData(overrides: Partial<BillingRunPreviewResponse> = {}): BillingRunPreviewResponse {
  return {
    memberCount: 3,
    chargeCount: 3,
    totalAmount: '195.00',
    exemptions: 0,
    existingCharges: 0,
    breakdown: [],
    warnings: [],
    ...overrides,
  } as BillingRunPreviewResponse;
}

describe('BillingRunPreview', () => {
  it('renders summary stats', () => {
    render(<BillingRunPreview data={makeData()} />);

    expect(screen.getByText('Zusammenfassung')).toBeInTheDocument();
    expect(screen.getByText('Mitglieder:')).toBeInTheDocument();
  });

  /**
   * Regression WR-05: the breakdown previously rendered a "Keine Beitragsart"
   * badge whenever a warning's `memberName` equalled a breakdown row's
   * `membershipType`. Member full names never equal breakdown type/category
   * names, so the branch was dead. Even when a warning name happens to collide
   * with a breakdown row name, no "Keine Beitragsart" badge must render —
   * members without a Beitragsart are excluded from the breakdown entirely.
   */
  it('never renders a "Keine Beitragsart" badge inside breakdown rows', () => {
    const breakdown: BreakdownRow[] = [
      { membershipType: 'Max Mustermann', count: 1, subtotal: '65.00', kind: 'membershipType' },
    ];
    const data = makeData({
      breakdown: breakdown as BillingRunPreviewResponse['breakdown'],
      // Deliberately collide warning name with the breakdown row name.
      warnings: [{ memberId: 'm1', memberName: 'Max Mustermann', reason: 'Keine Beitragsart' }],
    });

    render(<BillingRunPreview data={data} />);

    expect(screen.queryByText('Keine Beitragsart')).not.toBeInTheDocument();
  });

  /**
   * WR-04: breakdown rows must be labeled by their kind so a membership type
   * and a fee category that share a display name are not conflated.
   */
  it('labels membership-type rows with "Mitgliedsart"', () => {
    const breakdown: BreakdownRow[] = [
      {
        membershipType: 'Ordentliches Mitglied',
        count: 2,
        subtotal: '130.00',
        kind: 'membershipType',
      },
    ];
    render(
      <BillingRunPreview
        data={makeData({ breakdown: breakdown as BillingRunPreviewResponse['breakdown'] })}
      />
    );

    expect(screen.getByText('Ordentliches Mitglied')).toBeInTheDocument();
    expect(screen.getByText('Mitgliedsart')).toBeInTheDocument();
  });

  it('labels category rows with "Kategorie"', () => {
    const breakdown: BreakdownRow[] = [
      { membershipType: 'Spendenbeitrag', count: 5, subtotal: '250.00', kind: 'category' },
    ];
    render(
      <BillingRunPreview
        data={makeData({ breakdown: breakdown as BillingRunPreviewResponse['breakdown'] })}
      />
    );

    expect(screen.getByText('Spendenbeitrag')).toBeInTheDocument();
    expect(screen.getByText('Kategorie')).toBeInTheDocument();
  });

  it('distinguishes a category and a membership type that share a name', () => {
    const breakdown: BreakdownRow[] = [
      { membershipType: 'Förderung', count: 2, subtotal: '100.00', kind: 'membershipType' },
      { membershipType: 'Förderung', count: 3, subtotal: '90.00', kind: 'category' },
    ];
    render(
      <BillingRunPreview
        data={makeData({ breakdown: breakdown as BillingRunPreviewResponse['breakdown'] })}
      />
    );

    expect(screen.getByText('Mitgliedsart')).toBeInTheDocument();
    expect(screen.getByText('Kategorie')).toBeInTheDocument();
    expect(screen.getAllByText('Förderung')).toHaveLength(2);
  });

  it('falls back to "Mitgliedsart" when kind is absent', () => {
    const breakdown: BreakdownRow[] = [
      { membershipType: 'Ehrenmitglied', count: 1, subtotal: '0.00' },
    ];
    render(
      <BillingRunPreview
        data={makeData({ breakdown: breakdown as BillingRunPreviewResponse['breakdown'] })}
      />
    );

    expect(screen.getByText('Mitgliedsart')).toBeInTheDocument();
  });

  it('shows the warnings banner for members without Beitragsart', () => {
    const data = makeData({
      warnings: [{ memberId: 'm1', memberName: 'Erika Beispiel', reason: 'Keine Beitragsart' }],
    });
    render(<BillingRunPreview data={data} />);

    // The banner lists the excluded member; this is separate from the breakdown.
    expect(screen.getByText(/werden nicht berücksichtigt/i)).toBeInTheDocument();
    expect(screen.getByText(/Erika Beispiel/)).toBeInTheDocument();
  });
});
