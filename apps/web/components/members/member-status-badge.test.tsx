import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemberStatusBadge } from './member-status-badge';

describe('MemberStatusBadge', () => {
  it('renders "Aktiv" with success styling for ACTIVE', () => {
    render(<MemberStatusBadge status="ACTIVE" />);

    const badge = screen.getByText('Aktiv');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('text-success');
  });

  it('renders "Inaktiv" with warning styling for INACTIVE', () => {
    render(<MemberStatusBadge status="INACTIVE" />);

    const badge = screen.getByText('Inaktiv');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('text-warning-foreground');
  });

  it('renders "Ausstehend" with accent styling for PENDING', () => {
    render(<MemberStatusBadge status="PENDING" />);

    const badge = screen.getByText('Ausstehend');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('text-accent-foreground');
  });

  it('renders "Ausgetreten" with muted styling for LEFT', () => {
    render(<MemberStatusBadge status="LEFT" />);

    const badge = screen.getByText('Ausgetreten');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('text-muted-foreground');
  });

  it('falls back to raw status string for unknown status', () => {
    render(<MemberStatusBadge status="UNKNOWN" />);

    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
  });

  it('applies additional className', () => {
    render(<MemberStatusBadge status="ACTIVE" className="ml-2" />);

    const badge = screen.getByText('Aktiv');
    expect(badge.className).toContain('ml-2');
  });
});
