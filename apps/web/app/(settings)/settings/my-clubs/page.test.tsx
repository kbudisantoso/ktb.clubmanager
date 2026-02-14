import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock hooks
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock club store
const mockSetActiveClub = vi.fn();
const mockClearActiveClub = vi.fn();
let mockActiveClubSlug: string | null = null;

vi.mock('@/lib/club-store', () => ({
  useClubStore: () => ({
    activeClubSlug: mockActiveClubSlug,
    setActiveClub: mockSetActiveClub,
    clearActiveClub: mockClearActiveClub,
  }),
}));

// Mock ClubAvatar
vi.mock('@/components/club-switcher/club-avatar', () => ({
  ClubAvatar: ({ name }: { name: string }) => <div data-testid="club-avatar">{name}</div>,
}));

// Mock use-clubs hooks
let mockClubs: Array<{
  id: string;
  name: string;
  slug: string;
  roles: string[];
  avatarColor?: string;
}> = [];
let mockCanCreateClub = true;
let mockRequests: Array<{
  id: string;
  status: string;
  createdAt: string;
  club: { id: string; name: string; slug: string };
}> = [];
let mockClubsLoading = false;
let mockRequestsLoading = false;

const mockLeaveMutate = vi.fn();
let mockLeaveIsPending = false;

vi.mock('@/hooks/use-clubs', () => ({
  useMyClubsQuery: () => ({
    data: { clubs: mockClubs, canCreateClub: mockCanCreateClub },
    isLoading: mockClubsLoading,
  }),
  useMyAccessRequestsQuery: () => ({
    data: mockRequests,
    isLoading: mockRequestsLoading,
  }),
  useLeaveClubMutation: () => ({
    mutate: mockLeaveMutate,
    isPending: mockLeaveIsPending,
  }),
}));

// Import after mocks
import MyClubsPage from './page';

describe('MyClubsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClubs = [];
    mockCanCreateClub = true;
    mockRequests = [];
    mockActiveClubSlug = null;
    mockClubsLoading = false;
    mockRequestsLoading = false;
    mockLeaveIsPending = false;
  });

  describe('sunshine path', () => {
    it('renders the page title and create button', async () => {
      render(<MyClubsPage />);

      expect(screen.getByText('Meine Vereine')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /verein erstellen/i })).toHaveAttribute(
        'href',
        '/clubs/new'
      );
    });

    it('displays user clubs when loaded', async () => {
      mockClubs = [
        { id: '1', name: 'TSV Test', slug: 'tsv-test', roles: ['OWNER'] },
        { id: '2', name: 'FC Demo', slug: 'fc-demo', roles: ['ADMIN'] },
      ];

      render(<MyClubsPage />);

      expect(screen.getAllByText('TSV Test').length).toBeGreaterThan(0);
      expect(screen.getAllByText('FC Demo').length).toBeGreaterThan(0);
    });

    it('shows role badges for each club', async () => {
      mockClubs = [{ id: '1', name: 'TSV Test', slug: 'tsv-test', roles: ['OWNER'] }];

      render(<MyClubsPage />);

      expect(screen.getByText('Verantwortlicher')).toBeInTheDocument();
    });

    it('shows active badge for current club', async () => {
      mockClubs = [{ id: '1', name: 'TSV Test', slug: 'tsv-test', roles: ['OWNER'] }];
      mockActiveClubSlug = 'tsv-test';

      render(<MyClubsPage />);

      expect(screen.getByText('Aktiv')).toBeInTheDocument();
    });
  });

  describe('invite code section', () => {
    it('renders invite code input', async () => {
      render(<MyClubsPage />);

      expect(screen.getByText(/einladungscode eingeben/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('XXXX-XXXX')).toBeInTheDocument();
    });

    it('enables button when invite code is entered', async () => {
      const user = userEvent.setup();

      render(<MyClubsPage />);

      const input = screen.getByPlaceholderText('XXXX-XXXX');
      const button = screen.getByRole('button', { name: /einlösen/i });

      expect(button).toBeDisabled();

      await user.type(input, 'ABCD1234');

      expect(button).not.toBeDisabled();
    });

    it('navigates to join page when invite code is submitted', async () => {
      const user = userEvent.setup();

      render(<MyClubsPage />);

      const input = screen.getByPlaceholderText('XXXX-XXXX');
      await user.type(input, 'HXNK4P9M');
      await user.click(screen.getByRole('button', { name: /einlösen/i }));

      expect(mockPush).toHaveBeenCalledWith('/join/HXNK-4P9M');
    });
  });

  describe('edge cases', () => {
    it('shows empty state when no clubs', async () => {
      render(<MyClubsPage />);

      expect(screen.getByText(/noch keinem verein zugeordnet/i)).toBeInTheDocument();
    });

    it('shows loading state initially', () => {
      mockClubsLoading = true;

      render(<MyClubsPage />);

      // Skeleton is rendered during loading
      expect(screen.getByTestId('club-list-skeleton')).toBeInTheDocument();
    });

    it('prevents owner from leaving club', async () => {
      mockClubs = [{ id: '1', name: 'TSV Test', slug: 'tsv-test', roles: ['OWNER'] }];

      render(<MyClubsPage />);

      // Find the leave button - it should be disabled for owner
      const leaveButton = screen.getByTitle('Verantwortliche können nicht austreten');
      expect(leaveButton).toBeDisabled();
    });

    it('normalizes invite code input (lowercase, spaces, hyphens)', async () => {
      const user = userEvent.setup();

      render(<MyClubsPage />);

      const input = screen.getByPlaceholderText('XXXX-XXXX');
      await user.type(input, 'hxnk4p9m');
      await user.click(screen.getByRole('button', { name: /einlösen/i }));

      expect(mockPush).toHaveBeenCalledWith('/join/HXNK-4P9M');
    });

    it('auto-inserts hyphen after 4th character', async () => {
      const user = userEvent.setup();

      render(<MyClubsPage />);

      const input = screen.getByPlaceholderText('XXXX-XXXX') as HTMLInputElement;
      await user.type(input, 'ABCDE');

      // Should be formatted as "ABCD-E"
      expect(input.value).toBe('ABCD-E');
    });
  });

  describe('leave club', () => {
    it('opens confirmation dialog when non-owner clicks leave button', async () => {
      const user = userEvent.setup();
      mockClubs = [{ id: '1', name: 'TSV Test', slug: 'tsv-test', roles: ['MEMBER'] }];

      render(<MyClubsPage />);

      const leaveButton = screen.getByTitle('Verein verlassen');
      await user.click(leaveButton);

      // Dialog should be open with confirmation text and input
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/möchtest du "TSV Test" wirklich verlassen/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('VERLASSEN')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /abbrechen/i })).toBeInTheDocument();
    });

    it('disables confirm button until VERLASSEN is typed', async () => {
      const user = userEvent.setup();
      mockClubs = [{ id: '1', name: 'TSV Test', slug: 'tsv-test', roles: ['MEMBER'] }];

      render(<MyClubsPage />);

      const leaveButton = screen.getByTitle('Verein verlassen');
      await user.click(leaveButton);

      const dialog = screen.getByRole('dialog');
      const confirmButton = dialog.querySelector(
        'button[data-variant="destructive"]'
      ) as HTMLButtonElement;

      // Button should be disabled initially
      expect(confirmButton).toBeDisabled();

      // Type partial text - still disabled
      const input = screen.getByPlaceholderText('VERLASSEN');
      await user.type(input, 'VERLA');
      expect(confirmButton).toBeDisabled();

      // Complete the word - should be enabled
      await user.type(input, 'SSEN');
      expect(confirmButton).not.toBeDisabled();
    });

    it('accepts case-insensitive confirmation', async () => {
      const user = userEvent.setup();
      mockClubs = [{ id: '1', name: 'TSV Test', slug: 'tsv-test', roles: ['MEMBER'] }];

      render(<MyClubsPage />);

      const leaveButton = screen.getByTitle('Verein verlassen');
      await user.click(leaveButton);

      const dialog = screen.getByRole('dialog');
      const confirmButton = dialog.querySelector(
        'button[data-variant="destructive"]'
      ) as HTMLButtonElement;
      const input = screen.getByPlaceholderText('VERLASSEN');

      // Type in lowercase - should still work
      await user.type(input, 'verlassen');
      expect(confirmButton).not.toBeDisabled();
    });

    it('calls leave mutation when user types VERLASSEN and confirms', async () => {
      const user = userEvent.setup();
      mockClubs = [{ id: '1', name: 'TSV Test', slug: 'tsv-test', roles: ['MEMBER'] }];

      render(<MyClubsPage />);

      // Click leave button to open dialog
      const leaveButton = screen.getByTitle('Verein verlassen');
      await user.click(leaveButton);

      // Type confirmation and click confirm button
      const input = screen.getByPlaceholderText('VERLASSEN');
      await user.type(input, 'VERLASSEN');

      const dialog = screen.getByRole('dialog');
      const confirmButton = dialog.querySelector('button[data-variant="destructive"]');
      await user.click(confirmButton!);

      expect(mockLeaveMutate).toHaveBeenCalledWith(
        'tsv-test',
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });

    it('shows toast after successfully leaving club', async () => {
      const user = userEvent.setup();
      mockClubs = [{ id: '1', name: 'TSV Test', slug: 'tsv-test', roles: ['ADMIN'] }];

      // Mock the mutation to call onSuccess
      mockLeaveMutate.mockImplementation((_slug: string, options: { onSuccess: () => void }) => {
        options.onSuccess();
      });

      render(<MyClubsPage />);

      // Open dialog, type confirmation, and confirm
      const leaveButton = screen.getByTitle('Verein verlassen');
      await user.click(leaveButton);
      const input = screen.getByPlaceholderText('VERLASSEN');
      await user.type(input, 'VERLASSEN');
      const dialog = screen.getByRole('dialog');
      const confirmButton = dialog.querySelector('button[data-variant="destructive"]');
      await user.click(confirmButton!);

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Verein verlassen',
        })
      );
    });

    it('clears active club if leaving the currently active club', async () => {
      const user = userEvent.setup();
      mockClubs = [{ id: '1', name: 'TSV Test', slug: 'tsv-test', roles: ['MEMBER'] }];
      mockActiveClubSlug = 'tsv-test';

      mockLeaveMutate.mockImplementation((_slug: string, options: { onSuccess: () => void }) => {
        options.onSuccess();
      });

      render(<MyClubsPage />);

      // Open dialog, type confirmation, and confirm
      const leaveButton = screen.getByTitle('Verein verlassen');
      await user.click(leaveButton);
      const input = screen.getByPlaceholderText('VERLASSEN');
      await user.type(input, 'VERLASSEN');
      const dialog = screen.getByRole('dialog');
      const confirmButton = dialog.querySelector('button[data-variant="destructive"]');
      await user.click(confirmButton!);

      expect(mockClearActiveClub).toHaveBeenCalled();
    });

    it('shows error toast when leaving fails', async () => {
      const user = userEvent.setup();
      mockClubs = [{ id: '1', name: 'TSV Test', slug: 'tsv-test', roles: ['MEMBER'] }];

      mockLeaveMutate.mockImplementation(
        (_slug: string, options: { onError: (error: Error) => void }) => {
          options.onError(new Error('Fehler beim Verlassen'));
        }
      );

      render(<MyClubsPage />);

      // Open dialog, type confirmation, and confirm
      const leaveButton = screen.getByTitle('Verein verlassen');
      await user.click(leaveButton);
      const input = screen.getByPlaceholderText('VERLASSEN');
      await user.type(input, 'VERLASSEN');
      const dialog = screen.getByRole('dialog');
      const confirmButton = dialog.querySelector('button[data-variant="destructive"]');
      await user.click(confirmButton!);

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Fehler',
          variant: 'destructive',
        })
      );
    });

    it('does not call mutation if user cancels dialog', async () => {
      const user = userEvent.setup();
      mockClubs = [{ id: '1', name: 'TSV Test', slug: 'tsv-test', roles: ['MEMBER'] }];

      render(<MyClubsPage />);

      // Open dialog
      const leaveButton = screen.getByTitle('Verein verlassen');
      await user.click(leaveButton);

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: /abbrechen/i });
      await user.click(cancelButton);

      expect(mockLeaveMutate).not.toHaveBeenCalled();
    });

    it('disables leave button for OWNER', async () => {
      mockClubs = [{ id: '1', name: 'TSV Test', slug: 'tsv-test', roles: ['OWNER'] }];

      render(<MyClubsPage />);

      const leaveButton = screen.getByTitle('Verantwortliche können nicht austreten');
      expect(leaveButton).toBeDisabled();
    });
  });

  describe('pending requests', () => {
    it('displays pending access requests', async () => {
      mockRequests = [
        {
          id: 'req1',
          status: 'PENDING',
          createdAt: '2025-01-15T10:00:00Z',
          club: { id: 'c1', name: 'Pending Club', slug: 'pending-club' },
        },
      ];

      render(<MyClubsPage />);

      expect(screen.getByText('Offene Anfragen')).toBeInTheDocument();
      expect(screen.getAllByText('Pending Club').length).toBeGreaterThan(0);
    });

    it('allows canceling pending request', async () => {
      const user = userEvent.setup();
      mockRequests = [
        {
          id: 'req1',
          status: 'PENDING',
          createdAt: '2025-01-15T10:00:00Z',
          club: { id: 'c1', name: 'Pending Club', slug: 'pending-club' },
        },
      ];

      render(<MyClubsPage />);

      await user.click(screen.getByRole('button', { name: /zurückziehen/i }));

      expect(mockToast).toHaveBeenCalledWith({ title: 'Anfrage zurückgezogen' });
    });
  });
});
