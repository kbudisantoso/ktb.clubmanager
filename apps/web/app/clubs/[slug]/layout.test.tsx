import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
let mockParams = { slug: 'test-club' };
vi.mock('next/navigation', () => ({
  useParams: () => mockParams,
}));

// Mock clubs hook
let mockClubs: Array<{
  id: string;
  slug: string;
  name: string;
  roles: string[];
}> = [];
vi.mock('@/hooks/use-clubs', () => ({
  useMyClubsQuery: () => ({
    data: { clubs: mockClubs },
    isLoading: false,
  }),
}));

// Mock club store
const mockSetActiveClub = vi.fn();
vi.mock('@/lib/club-store', () => ({
  useClubStore: () => ({
    setActiveClub: mockSetActiveClub,
  }),
}));

// Mock permissions query (TanStack Query replaces fetch-permissions)
vi.mock('@/hooks/use-club-permissions', () => ({
  useClubPermissionsQuery: () => ({
    data: null,
    isLoading: false,
    error: null,
  }),
}));

// Mock Header component to simplify tests
vi.mock('@/components/layout/header', () => ({
  Header: () => <header data-testid="mock-header">Header</header>,
}));

// Import after mocks
import ClubLayout from './layout';

describe('ClubLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { slug: 'test-club' };
    mockClubs = [];
  });

  describe('rendering', () => {
    it('renders header and children', () => {
      render(
        <ClubLayout>
          <div data-testid="child-content">Club Content</div>
        </ClubLayout>
      );

      expect(screen.getByTestId('mock-header')).toBeInTheDocument();
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('renders app background', () => {
      const { container } = render(
        <ClubLayout>
          <div>Content</div>
        </ClubLayout>
      );

      expect(container.querySelector('.app-background')).toBeInTheDocument();
    });
  });

  describe('club initialization', () => {
    it('sets active club when user has access', async () => {
      mockClubs = [{ id: 'club-1', slug: 'test-club', name: 'Test Club', roles: ['OWNER'] }];

      render(
        <ClubLayout>
          <div data-testid="child-content">Club Content</div>
        </ClubLayout>
      );

      await waitFor(() => {
        expect(mockSetActiveClub).toHaveBeenCalledWith('test-club');
      });
    });

    it('does not set active club if slug not in user clubs', async () => {
      mockClubs = [{ id: 'club-1', slug: 'other-club', name: 'Other Club', roles: ['OWNER'] }];

      render(
        <ClubLayout>
          <div>Content</div>
        </ClubLayout>
      );

      // Wait a bit to ensure effect has run
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockSetActiveClub).not.toHaveBeenCalled();
    });
  });
});
