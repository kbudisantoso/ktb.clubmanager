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

  it('renders "Probezeit" with primary styling for PROBATION', () => {
    render(<MemberStatusBadge status="PROBATION" />);

    const badge = screen.getByText('Probezeit');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('text-primary');
  });

  it('renders "Ruhend" with warning styling for DORMANT', () => {
    render(<MemberStatusBadge status="DORMANT" />);

    const badge = screen.getByText('Ruhend');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('text-warning-foreground');
  });

  it('renders "Gesperrt" with destructive styling for SUSPENDED', () => {
    render(<MemberStatusBadge status="SUSPENDED" />);

    const badge = screen.getByText('Gesperrt');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('text-destructive');
  });

  it('renders "Mitgliedschaft beantragt" with accent styling for PENDING', () => {
    render(<MemberStatusBadge status="PENDING" />);

    const badge = screen.getByText('Mitgliedschaft beantragt');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('text-foreground/70');
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
