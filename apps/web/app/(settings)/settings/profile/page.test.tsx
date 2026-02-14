import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock hooks
const mockUseSessionQuery = vi.fn();
vi.mock('@/hooks/use-session', () => ({
  useSessionQuery: () => mockUseSessionQuery(),
  useInvalidateSession: () => vi.fn(),
  useForceRefreshSession: () => vi.fn(),
}));

// Mock ProfileForm to isolate page-level tests
vi.mock('@/components/settings/profile-form', () => ({
  ProfileForm: () => <div data-testid="profile-form">ProfileForm</div>,
}));

// Import after mocks
import ProfilePage from './page';

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sunshine path', () => {
    it('renders profile card with title and description', () => {
      mockUseSessionQuery.mockReturnValue({
        data: {
          user: { id: '1', name: 'Max Mustermann', email: 'max@example.de' },
        },
        isLoading: false,
      });

      render(<ProfilePage />);

      expect(screen.getByText('Profil')).toBeInTheDocument();
      expect(screen.getByText('Deine persönlichen Informationen')).toBeInTheDocument();
    });

    it('renders ProfileForm when session loaded', () => {
      mockUseSessionQuery.mockReturnValue({
        data: {
          user: { id: '1', name: 'Max Mustermann', email: 'max@example.de' },
        },
        isLoading: false,
      });

      render(<ProfilePage />);

      expect(screen.getByTestId('profile-form')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('shows skeleton when loading', () => {
      mockUseSessionQuery.mockReturnValue({
        data: null,
        isLoading: true,
      });

      render(<ProfilePage />);

      // Skeleton should be visible (card wrapper exists but no ProfileForm)
      expect(document.querySelector('[data-slot="card"]')).toBeInTheDocument();
      expect(screen.queryByTestId('profile-form')).not.toBeInTheDocument();
    });

    it('shows skeleton when session has no user', () => {
      mockUseSessionQuery.mockReturnValue({
        data: { user: null },
        isLoading: false,
      });

      render(<ProfilePage />);

      expect(screen.queryByTestId('profile-form')).not.toBeInTheDocument();
    });
  });
});
