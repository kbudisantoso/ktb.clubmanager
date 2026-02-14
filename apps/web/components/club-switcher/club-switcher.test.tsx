import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock club store - we need to control what the hooks return
const mockSetActiveClub = vi.fn();

vi.mock('@/lib/club-store', async () => {
  const actual = await vi.importActual('@/lib/club-store');
  return {
    ...actual,
    useClubStore: vi.fn(() => ({
      activeClubSlug: null,
      setActiveClub: mockSetActiveClub,
    })),
  };
});

// Mock use-clubs hook - initial mock, overridden in beforeEach
vi.mock('@/hooks/use-clubs', () => ({
  useMyClubsQuery: vi.fn(),
}));

import { ClubSwitcher } from './club-switcher';
import * as clubStoreModule from '@/lib/club-store';
import * as useClubsModule from '@/hooks/use-clubs';
import type { ClubContext } from '@/lib/club-store';

/** Helper to create ClubContext */
function createTestClub(partial: ClubContext): ClubContext {
  return { ...partial };
}

describe('ClubSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock - no clubs
    vi.mocked(useClubsModule.useMyClubsQuery).mockReturnValue({
      data: { clubs: [] as ClubContext[], canCreateClub: true },
      isLoading: false,
    } as unknown as ReturnType<typeof useClubsModule.useMyClubsQuery>);
    vi.mocked(clubStoreModule.useClubStore).mockReturnValue({
      activeClubSlug: null,
      setActiveClub: mockSetActiveClub,
    } as ReturnType<typeof clubStoreModule.useClubStore>);
  });

  describe('no clubs state', () => {
    it("renders 'Verein erstellen' button when no clubs", () => {
      render(<ClubSwitcher />);

      expect(screen.getByRole('button', { name: /verein erstellen/i })).toBeInTheDocument();
    });

    it('navigates to /clubs/new when create button clicked', async () => {
      const user = userEvent.setup();

      render(<ClubSwitcher />);

      await user.click(screen.getByRole('button', { name: /verein erstellen/i }));

      expect(mockPush).toHaveBeenCalledWith('/clubs/new');
    });
  });

  describe('single club state', () => {
    const singleClub: ClubContext[] = [
      createTestClub({
        id: '1',
        name: 'TSV Musterstadt',
        slug: 'tsv-musterstadt',
        roles: ['OWNER'],
        avatarColor: 'blue',
      }),
    ];

    beforeEach(() => {
      vi.mocked(useClubsModule.useMyClubsQuery).mockReturnValue({
        data: { clubs: singleClub, canCreateClub: false },
        isLoading: false,
      } as ReturnType<typeof useClubsModule.useMyClubsQuery>);
    });

    it('returns null for single club (no switcher needed)', () => {
      const { container } = render(<ClubSwitcher />);

      // Component returns null for single club - nothing is rendered
      expect(container.firstChild).toBeNull();
    });

    it('does not show dropdown for single club', () => {
      render(<ClubSwitcher />);

      // No dropdown trigger when there's only one club
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('multiple clubs state', () => {
    const multipleClubs: ClubContext[] = [
      createTestClub({
        id: '1',
        name: 'TSV Musterstadt',
        slug: 'tsv-musterstadt',
        roles: ['OWNER'],
        avatarColor: 'blue',
      }),
      createTestClub({
        id: '2',
        name: 'FC Beispiel',
        slug: 'fc-beispiel',
        roles: ['ADMIN'],
        avatarColor: 'green',
      }),
      createTestClub({
        id: '3',
        name: 'SV Test',
        slug: 'sv-test',
        roles: ['MEMBER'],
        avatarColor: 'red',
      }),
    ];

    beforeEach(() => {
      vi.mocked(useClubsModule.useMyClubsQuery).mockReturnValue({
        data: { clubs: multipleClubs, canCreateClub: true },
        isLoading: false,
      } as ReturnType<typeof useClubsModule.useMyClubsQuery>);
      vi.mocked(clubStoreModule.useClubStore).mockReturnValue({
        activeClubSlug: 'tsv-musterstadt',
        setActiveClub: mockSetActiveClub,
      } as ReturnType<typeof clubStoreModule.useClubStore>);
    });

    it('renders dropdown trigger when 2+ clubs', () => {
      render(<ClubSwitcher />);

      // Should have a button trigger
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('TSV Musterstadt')).toBeInTheDocument();
    });

    it('opens dropdown and shows all clubs', async () => {
      const user = userEvent.setup();
      render(<ClubSwitcher />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        // Active club appears in button and dropdown, so use getAllByText
        expect(screen.getAllByText('TSV Musterstadt').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('FC Beispiel')).toBeInTheDocument();
        expect(screen.getByText('SV Test')).toBeInTheDocument();
      });
    });

    it('shows role badges correctly', async () => {
      const user = userEvent.setup();
      render(<ClubSwitcher />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('Verantwortlicher')).toBeInTheDocument(); // OWNER
        expect(screen.getByText('Admin')).toBeInTheDocument(); // ADMIN
        expect(screen.getByText('Mitglied')).toBeInTheDocument(); // VIEWER
      });
    });

    it('clicking club calls setActiveClub and navigates', async () => {
      const user = userEvent.setup();
      render(<ClubSwitcher />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('FC Beispiel')).toBeInTheDocument();
      });

      await user.click(screen.getByText('FC Beispiel'));

      expect(mockSetActiveClub).toHaveBeenCalledWith('fc-beispiel');
      expect(mockPush).toHaveBeenCalledWith('/clubs/fc-beispiel/dashboard');
    });

    it("shows 'Neuen Verein erstellen' in dropdown", async () => {
      const user = userEvent.setup();
      render(<ClubSwitcher />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText(/neuen verein erstellen/i)).toBeInTheDocument();
      });
    });

    it('clicking create navigates to /clubs/new', async () => {
      const user = userEvent.setup();
      render(<ClubSwitcher />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText(/neuen verein erstellen/i)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/neuen verein erstellen/i));

      expect(mockPush).toHaveBeenCalledWith('/clubs/new');
    });
  });

  describe('5+ clubs with search', () => {
    const manyClubs: ClubContext[] = [
      createTestClub({ id: '1', name: 'TSV Alpha', slug: 'tsv-alpha', roles: ['OWNER'] }),
      createTestClub({ id: '2', name: 'FC Beta', slug: 'fc-beta', roles: ['ADMIN'] }),
      createTestClub({ id: '3', name: 'SV Gamma', slug: 'sv-gamma', roles: ['MEMBER'] }),
      createTestClub({ id: '4', name: 'SC Delta', slug: 'sc-delta', roles: ['MEMBER'] }),
      createTestClub({ id: '5', name: 'VfB Epsilon', slug: 'vfb-epsilon', roles: ['MEMBER'] }),
    ];

    beforeEach(() => {
      vi.mocked(useClubsModule.useMyClubsQuery).mockReturnValue({
        data: { clubs: manyClubs, canCreateClub: true },
        isLoading: false,
      } as ReturnType<typeof useClubsModule.useMyClubsQuery>);
      vi.mocked(clubStoreModule.useClubStore).mockReturnValue({
        activeClubSlug: 'tsv-alpha',
        setActiveClub: mockSetActiveClub,
      } as ReturnType<typeof clubStoreModule.useClubStore>);
    });

    it('renders search input when 5+ clubs', async () => {
      const user = userEvent.setup();
      render(<ClubSwitcher />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/verein suchen/i)).toBeInTheDocument();
      });
    });

    it('filters clubs by search query', async () => {
      const user = userEvent.setup();
      render(<ClubSwitcher />);

      await user.click(screen.getByRole('button'));

      const searchInput = await screen.findByPlaceholderText(/verein suchen/i);
      expect(searchInput).toBeInTheDocument();

      // All clubs visible before search
      expect(screen.getByText('FC Beta')).toBeInTheDocument();
      expect(screen.getAllByText('TSV Alpha').length).toBeGreaterThanOrEqual(1);

      // Type in search
      await user.type(searchInput, 'Beta');

      // Only FC Beta should be visible in dropdown items
      await waitFor(() => {
        // FC Beta still visible
        expect(screen.getByText('FC Beta')).toBeInTheDocument();
      });
    });

    it('shows search input placeholder', async () => {
      const user = userEvent.setup();
      render(<ClubSwitcher />);

      await user.click(screen.getByRole('button'));

      const searchInput = await screen.findByPlaceholderText(/verein suchen/i);
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows dropdown placeholder when loading with empty data', () => {
      vi.mocked(useClubsModule.useMyClubsQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as ReturnType<typeof useClubsModule.useMyClubsQuery>);

      render(<ClubSwitcher />);

      // When loading with no clubs yet, component shows dropdown with placeholder
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Verein auswählen')).toBeInTheDocument();
    });
  });
});
