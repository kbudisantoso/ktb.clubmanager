import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock hooks
const mockMutateAsync = vi.fn();
const mockReset = vi.fn();
vi.mock('@/hooks/use-club-deactivation', () => ({
  useDeactivateClub: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
    reset: mockReset,
  }),
}));

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

import { ClubDeletionDialog } from './club-deletion-dialog';

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  clubName: 'TSV Musterstadt',
  slug: 'tsv-musterstadt',
  minGracePeriodDays: 7,
};

describe('ClubDeletionDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({ message: 'ok' });
  });

  describe('step transitions', () => {
    it('should show warning step initially', () => {
      render(<ClubDeletionDialog {...defaultProps} />);

      expect(screen.getByText('Verein löschen')).toBeInTheDocument();
      expect(screen.getByText('Weiter')).toBeInTheDocument();
    });

    /**
     * Regression: "Weiter" button used AlertDialogAction which closes
     * the dialog by default. Without e.preventDefault(), clicking "Weiter"
     * closed the dialog instead of transitioning to the confirm step.
     */
    it('should transition to confirm step when clicking "Weiter"', async () => {
      const user = userEvent.setup();
      render(<ClubDeletionDialog {...defaultProps} />);

      await user.click(screen.getByText('Weiter'));

      expect(screen.getByText('Löschung bestätigen')).toBeInTheDocument();
      expect(screen.getByText('Übergangsfrist')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('TSV Musterstadt')).toBeInTheDocument();
    });

    it('should go back to warning step when clicking "Zurück"', async () => {
      const user = userEvent.setup();
      render(<ClubDeletionDialog {...defaultProps} />);

      // Go to confirm step
      await user.click(screen.getByText('Weiter'));
      expect(screen.getByText('Löschung bestätigen')).toBeInTheDocument();

      // Go back
      await user.click(screen.getByText('Zurück'));
      expect(screen.getByText('Verein löschen')).toBeInTheDocument();
    });
  });

  describe('confirm step', () => {
    async function goToConfirmStep() {
      const user = userEvent.setup();
      render(<ClubDeletionDialog {...defaultProps} />);
      await user.click(screen.getByText('Weiter'));
      return user;
    }

    it('should disable delete button until club name matches', async () => {
      const user = await goToConfirmStep();

      const deleteButton = screen.getByRole('button', { name: /Verein löschen/i });
      expect(deleteButton).toBeDisabled();

      await user.type(screen.getByPlaceholderText('TSV Musterstadt'), 'TSV Musterstadt');
      expect(deleteButton).toBeEnabled();
    });

    it('should call deactivateClub on confirm', async () => {
      const user = await goToConfirmStep();

      await user.type(screen.getByPlaceholderText('TSV Musterstadt'), 'TSV Musterstadt');
      await user.click(screen.getByRole('button', { name: /Verein löschen/i }));

      expect(mockMutateAsync).toHaveBeenCalledWith({
        gracePeriodDays: 30,
        confirmationName: 'TSV Musterstadt',
      });
    });

    it('should show toast on successful deletion', async () => {
      const user = await goToConfirmStep();

      await user.type(screen.getByPlaceholderText('TSV Musterstadt'), 'TSV Musterstadt');
      await user.click(screen.getByRole('button', { name: /Verein löschen/i }));

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Verein wird deaktiviert',
        })
      );
    });

    it('should show error toast on failure', async () => {
      mockMutateAsync.mockRejectedValueOnce(new Error('Nicht berechtigt'));
      const user = await goToConfirmStep();

      await user.type(screen.getByPlaceholderText('TSV Musterstadt'), 'TSV Musterstadt');
      await user.click(screen.getByRole('button', { name: /Verein löschen/i }));

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Fehler',
          description: 'Nicht berechtigt',
          variant: 'destructive',
        })
      );
    });
  });
});
