import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ClubNotFound } from './club-not-found';

describe('ClubNotFound', () => {
  describe('content', () => {
    it('displays security-conscious title', () => {
      render(<ClubNotFound />);

      expect(screen.getByText('Verein nicht gefunden')).toBeInTheDocument();
    });

    it("displays ambiguous description that doesn't reveal access status", () => {
      render(<ClubNotFound />);

      expect(
        screen.getByText('Der Verein existiert nicht oder du hast keinen Zugriff.')
      ).toBeInTheDocument();
    });

    it('provides link back to dashboard', () => {
      render(<ClubNotFound />);

      const link = screen.getByRole('link', { name: 'Zurück zum Dashboard' });
      expect(link).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('accessibility', () => {
    it('renders as a card with proper structure', () => {
      const { container } = render(<ClubNotFound />);

      // Check for card structure
      expect(container.querySelector("[data-slot='card']")).toBeInTheDocument();
      expect(container.querySelector("[data-slot='card-title']")).toBeInTheDocument();
      expect(container.querySelector("[data-slot='card-description']")).toBeInTheDocument();
    });

    it('includes shield icon for visual indication', () => {
      const { container } = render(<ClubNotFound />);

      // ShieldX icon should be present
      const icon = container.querySelector('.lucide-shield-x');
      expect(icon).toBeInTheDocument();
    });
  });
});
