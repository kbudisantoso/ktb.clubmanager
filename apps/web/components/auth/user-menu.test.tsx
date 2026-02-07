import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all dependencies
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}));

vi.mock('@/lib/auth-client', () => ({
  authClient: { signOut: vi.fn() },
}));

let mockSession: { user: { name: string | null; email: string; image?: string } } | null = null;

vi.mock('@/hooks/use-session', () => ({
  useSessionQuery: () => ({ data: mockSession, isLoading: false }),
  useClearSession: () => vi.fn(),
}));

vi.mock('@/hooks/use-clubs', () => ({
  useMyClubsQuery: () => ({ data: { clubs: [], canCreateClub: false } }),
}));

vi.mock('@/lib/broadcast-auth', () => ({
  getAuthBroadcast: () => ({ notifyLogout: vi.fn(), clearAuthState: vi.fn() }),
}));

vi.mock('@/lib/club-store', () => ({
  useActiveClub: () => null,
}));

vi.mock('@/lib/club-permissions', () => ({
  useCanManageSettings: () => false,
}));

vi.mock('@/components/club-switcher/club-switcher-modal', () => ({
  ClubSwitcherModal: () => null,
}));

// Import after mocks
import { UserMenu } from './user-menu';

describe('UserMenu', () => {
  beforeEach(() => {
    mockSession = null;
  });

  describe('user initials', () => {
    it('uses first and last word initials for multi-word names', () => {
      mockSession = {
        user: { name: 'Florian Ulf Mayer', email: 'test@test.com' },
      };

      render(<UserMenu />);

      // Avatar fallback should show "FM" (first + last word)
      expect(screen.getByText('FM')).toBeInTheDocument();
    });

    it('uses first and last word initials for two-word names', () => {
      mockSession = {
        user: { name: 'Max Mustermann', email: 'test@test.com' },
      };

      render(<UserMenu />);

      expect(screen.getByText('MM')).toBeInTheDocument();
    });

    it('uses single initial for single-word names', () => {
      mockSession = {
        user: { name: 'Admin', email: 'test@test.com' },
      };

      render(<UserMenu />);

      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('handles names with extra spaces correctly', () => {
      mockSession = {
        user: { name: '  Anna   Maria   Schmidt  ', email: 'test@test.com' },
      };

      render(<UserMenu />);

      // Should be "AS" (Anna + Schmidt)
      expect(screen.getByText('AS')).toBeInTheDocument();
    });

    it('converts initials to uppercase', () => {
      mockSession = {
        user: { name: 'max mustermann', email: 'test@test.com' },
      };

      render(<UserMenu />);

      expect(screen.getByText('MM')).toBeInTheDocument();
    });

    it('shows user icon when no name is provided', () => {
      mockSession = {
        user: { name: null, email: 'test@test.com' },
      };

      render(<UserMenu />);

      // When no name, fallback shows User icon (SVG) instead of initials
      const userIcon = document.querySelector('.lucide-user');
      expect(userIcon).toBeInTheDocument();
    });

    it('shows user icon for empty string name', () => {
      mockSession = {
        user: { name: '', email: 'test@test.com' },
      };

      render(<UserMenu />);

      // Empty string should be treated as no name
      const userIcon = document.querySelector('.lucide-user');
      expect(userIcon).toBeInTheDocument();
    });
  });

  describe('rendering', () => {
    it('returns null when not authenticated', () => {
      mockSession = null;

      const { container } = render(<UserMenu />);

      expect(container.firstChild).toBeNull();
    });

    it('shows user avatar when authenticated', () => {
      mockSession = {
        user: { name: 'Test User', email: 'test@test.com' },
      };

      render(<UserMenu />);

      expect(screen.getByText('TU')).toBeInTheDocument();
    });
  });
});
