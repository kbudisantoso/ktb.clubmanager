import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
const mockPush = vi.fn();
const mockBack = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

// Mock hooks
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock club store
const mockSetActiveClub = vi.fn();
vi.mock('@/lib/club-store', () => ({
  useClubStore: () => ({
    setActiveClub: mockSetActiveClub,
  }),
}));

// Mock debounce to return value immediately
vi.mock('@/hooks/use-debounce', () => ({
  useDebounce: (value: string) => value,
}));

// Mock clubs hooks
let mockSlugCheck: { available: boolean } | undefined = { available: true };
let mockIsCheckingSlug = false;
const mockCreateMutateAsync = vi.fn();
let mockCreateIsPending = false;
vi.mock('@/hooks/use-clubs', () => ({
  useCheckSlugQuery: (slug: string) => ({
    data: slug.length >= 3 ? mockSlugCheck : undefined,
    isFetching: mockIsCheckingSlug,
  }),
  useCreateClubMutation: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: mockCreateIsPending,
  }),
}));

// Import after mocks
import NewClubPage from './page';

describe('NewClubPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSlugCheck = { available: true };
    mockIsCheckingSlug = false;
    mockCreateIsPending = false;
  });

  describe('sunshine path', () => {
    it('renders the club creation form', () => {
      render(<NewClubPage />);

      expect(screen.getByText('Neuen Verein erstellen')).toBeInTheDocument();
      expect(screen.getByLabelText(/vereinsname/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/url-pfad/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/beschreibung/i)).toBeInTheDocument();
      expect(screen.getByText(/sichtbarkeit/i)).toBeInTheDocument();
    });

    it('has back link to dashboard', () => {
      render(<NewClubPage />);

      expect(screen.getByRole('link', { name: /zurück/i })).toHaveAttribute('href', '/dashboard');
    });

    it('shows visibility options', () => {
      render(<NewClubPage />);

      expect(screen.getByLabelText(/privat/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/öffentlich/i)).toBeInTheDocument();
    });

    it('auto-generates slug from name', async () => {
      const user = userEvent.setup();

      render(<NewClubPage />);

      const nameInput = screen.getByLabelText(/vereinsname/i);
      await user.type(nameInput, 'TSV Musterstadt 1920');

      await waitFor(() => {
        expect(screen.getByLabelText(/url-pfad/i)).toHaveValue('tsv-musterstadt-1920');
      });
    });

    it('handles German umlauts in slug generation', async () => {
      const user = userEvent.setup();

      render(<NewClubPage />);

      const nameInput = screen.getByLabelText(/vereinsname/i);
      await user.type(nameInput, 'Grün-Weiß München');

      await waitFor(() => {
        expect(screen.getByLabelText(/url-pfad/i)).toHaveValue('gruen-weiss-muenchen');
      });
    });

    it('submits form and redirects to club dashboard', async () => {
      const user = userEvent.setup();
      const createdClub = { id: 'new-1', name: 'Test Club', slug: 'test-club' };
      mockCreateMutateAsync.mockResolvedValue(createdClub);

      render(<NewClubPage />);

      await user.type(screen.getByLabelText(/vereinsname/i), 'Test Club');

      await waitFor(() => {
        expect(screen.getByLabelText(/url-pfad/i)).toHaveValue('test-club');
      });

      await user.click(screen.getByRole('button', { name: /verein erstellen/i }));

      await waitFor(() => {
        expect(mockCreateMutateAsync).toHaveBeenCalledWith({
          name: 'Test Club',
          slug: 'test-club',
          shortCode: 'TC',
          description: undefined,
          visibility: 'PRIVATE',
        });
        expect(mockSetActiveClub).toHaveBeenCalledWith('test-club');
        expect(mockPush).toHaveBeenCalledWith('/clubs/test-club/dashboard');
      });
    });
  });

  describe('validation', () => {
    it('shows slug availability status', async () => {
      const user = userEvent.setup();
      mockSlugCheck = { available: true };

      render(<NewClubPage />);

      await user.type(screen.getByLabelText(/vereinsname/i), 'Test Club');

      await waitFor(() => {
        expect(screen.getByText('Verfügbar')).toBeInTheDocument();
      });
    });

    it('shows when slug is taken', async () => {
      const user = userEvent.setup();
      mockSlugCheck = { available: false };

      render(<NewClubPage />);

      await user.type(screen.getByLabelText(/vereinsname/i), 'Test Club');

      await waitFor(() => {
        expect(screen.getByText('Bereits vergeben')).toBeInTheDocument();
      });
    });

    it('disables submit when slug is taken', async () => {
      const user = userEvent.setup();
      mockSlugCheck = { available: false };

      render(<NewClubPage />);

      await user.type(screen.getByLabelText(/vereinsname/i), 'Test Club');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /verein erstellen/i })).toBeDisabled();
      });
    });

    it('disables submit when name is empty', () => {
      render(<NewClubPage />);

      expect(screen.getByRole('button', { name: /verein erstellen/i })).toBeDisabled();
    });
  });

  describe('edge cases', () => {
    it('allows manually editing slug', async () => {
      const user = userEvent.setup();

      render(<NewClubPage />);

      // First type a name
      await user.type(screen.getByLabelText(/vereinsname/i), 'TSV Test');

      // Then manually change the slug
      const slugInput = screen.getByLabelText(/url-pfad/i);
      await user.clear(slugInput);
      await user.type(slugInput, 'custom-slug');

      expect(slugInput).toHaveValue('custom-slug');
    });

    it('handles cancel button', async () => {
      const user = userEvent.setup();

      render(<NewClubPage />);

      await user.click(screen.getByRole('button', { name: /abbrechen/i }));

      expect(mockBack).toHaveBeenCalled();
    });

    it('handles API error on creation', async () => {
      const user = userEvent.setup();
      mockCreateMutateAsync.mockRejectedValue(new Error('Slug already taken'));

      render(<NewClubPage />);

      await user.type(screen.getByLabelText(/vereinsname/i), 'Test Club');

      await waitFor(() => {
        expect(screen.getByLabelText(/url-pfad/i)).toHaveValue('test-club');
      });

      await user.click(screen.getByRole('button', { name: /verein erstellen/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Fehler',
          description: 'Slug already taken',
          variant: 'destructive',
        });
      });
    });
  });
});
