import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemberEmptyState } from './member-empty-state';

// Mock next/navigation (useParams)
vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'test-club' }),
}));

describe('MemberEmptyState', () => {
  it('renders setup message for no-number-ranges variant', () => {
    render(<MemberEmptyState variant="no-number-ranges" />);

    expect(screen.getByText('Mitgliederverwaltung einrichten')).toBeInTheDocument();
    expect(screen.getByText(/Nummernkreise fuer die Mitgliedsnummern/)).toBeInTheDocument();
  });

  it('renders link to number ranges settings for no-number-ranges', () => {
    render(<MemberEmptyState variant="no-number-ranges" />);

    const link = screen.getByRole('link', { name: 'Nummernkreise einrichten' });
    expect(link).toHaveAttribute('href', '/clubs/test-club/settings/number-ranges');
  });

  it('renders "Noch keine Mitglieder" for no-members variant', () => {
    render(<MemberEmptyState variant="no-members" />);

    expect(screen.getByText('Noch keine Mitglieder')).toBeInTheDocument();
  });

  it('renders create button for no-members variant', () => {
    const onCreateMember = vi.fn();
    render(<MemberEmptyState variant="no-members" onCreateMember={onCreateMember} />);

    const button = screen.getByRole('button', { name: 'Erstes Mitglied anlegen' });
    expect(button).toBeInTheDocument();
  });

  it('renders "Keine Mitglieder gefunden" for no-results variant', () => {
    render(<MemberEmptyState variant="no-results" />);

    expect(screen.getByText('Keine Mitglieder gefunden')).toBeInTheDocument();
  });

  it('renders clear search button for no-results variant', () => {
    const onClearSearch = vi.fn();
    render(<MemberEmptyState variant="no-results" onClearSearch={onClearSearch} />);

    const button = screen.getByRole('button', { name: /Suche zuruecksetzen/ });
    expect(button).toBeInTheDocument();
  });
});
