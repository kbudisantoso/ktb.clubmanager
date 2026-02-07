import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock use-clubs hooks
const mockMutateAsync = vi.fn();
let mockAccessRequests: Array<{
  id: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  user: { id: string; name: string | null; email: string };
}> = [];
let mockIsLoading = false;

vi.mock('@/hooks/use-clubs', () => ({
  useClubAccessRequestsQuery: () => ({
    data: mockAccessRequests,
    isLoading: mockIsLoading,
  }),
  useApproveAccessRequestMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
  useRejectAccessRequestMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

// Mock use-toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Import after mocks
import { AccessRequestsCard } from './access-requests-card';

describe('AccessRequestsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAccessRequests = [];
    mockIsLoading = false;
  });

  describe('visibility', () => {
    it('does not render when there are no pending requests', () => {
      mockAccessRequests = [];

      const { container } = render(<AccessRequestsCard slug="test-club" />);

      expect(container.firstChild).toBeNull();
    });

    it('renders when there are pending requests', () => {
      mockAccessRequests = [
        {
          id: 'req-1',
          status: 'PENDING',
          createdAt: '2024-01-15T10:00:00Z',
          expiresAt: '2024-02-14T10:00:00Z',
          user: { id: 'user-1', name: 'Max Mustermann', email: 'max@example.com' },
        },
      ];

      render(<AccessRequestsCard slug="test-club" />);

      expect(screen.getByText('Beitrittsanfragen')).toBeInTheDocument();
    });

    it('shows loading state when loading and has potential data', () => {
      mockIsLoading = true;
      // When loading is true and we have cached data, the card renders with a spinner
      mockAccessRequests = [
        {
          id: 'req-1',
          status: 'PENDING',
          createdAt: '2024-01-15T10:00:00Z',
          expiresAt: '2024-02-14T10:00:00Z',
          user: { id: 'user-1', name: 'Max', email: 'max@example.com' },
        },
      ];

      render(<AccessRequestsCard slug="test-club" />);

      // Card renders with the title
      expect(screen.getByText('Beitrittsanfragen')).toBeInTheDocument();
    });
  });

  describe('request display', () => {
    it('displays user name and email', () => {
      mockAccessRequests = [
        {
          id: 'req-1',
          status: 'PENDING',
          createdAt: '2024-01-15T10:00:00Z',
          expiresAt: '2024-02-14T10:00:00Z',
          user: { id: 'user-1', name: 'Max Mustermann', email: 'max@example.com' },
        },
      ];

      render(<AccessRequestsCard slug="test-club" />);

      expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
      expect(screen.getByText('max@example.com')).toBeInTheDocument();
    });

    it('shows email as name when user has no name', () => {
      mockAccessRequests = [
        {
          id: 'req-1',
          status: 'PENDING',
          createdAt: '2024-01-15T10:00:00Z',
          expiresAt: '2024-02-14T10:00:00Z',
          user: { id: 'user-1', name: null, email: 'anon@example.com' },
        },
      ];

      render(<AccessRequestsCard slug="test-club" />);

      expect(screen.getByText('anon@example.com')).toBeInTheDocument();
    });

    it('shows request count badge', () => {
      mockAccessRequests = [
        {
          id: 'req-1',
          status: 'PENDING',
          createdAt: '2024-01-15T10:00:00Z',
          expiresAt: '2024-02-14T10:00:00Z',
          user: { id: 'user-1', name: 'Max', email: 'max@example.com' },
        },
        {
          id: 'req-2',
          status: 'PENDING',
          createdAt: '2024-01-16T10:00:00Z',
          expiresAt: '2024-02-15T10:00:00Z',
          user: { id: 'user-2', name: 'Anna', email: 'anna@example.com' },
        },
      ];

      render(<AccessRequestsCard slug="test-club" />);

      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('approve action', () => {
    it('calls approve mutation when clicking approve button', async () => {
      const user = userEvent.setup();
      mockAccessRequests = [
        {
          id: 'req-1',
          status: 'PENDING',
          createdAt: '2024-01-15T10:00:00Z',
          expiresAt: '2024-02-14T10:00:00Z',
          user: { id: 'user-1', name: 'Max Mustermann', email: 'max@example.com' },
        },
      ];
      mockMutateAsync.mockResolvedValue({ message: 'Anfrage genehmigt' });

      render(<AccessRequestsCard slug="test-club" />);

      const approveButton = screen.getByTitle('Genehmigen');
      await user.click(approveButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          requestId: 'req-1',
          roles: ['MEMBER'],
        });
      });
    });
  });

  describe('reject action', () => {
    it('opens reject dialog when clicking reject button', async () => {
      const user = userEvent.setup();
      mockAccessRequests = [
        {
          id: 'req-1',
          status: 'PENDING',
          createdAt: '2024-01-15T10:00:00Z',
          expiresAt: '2024-02-14T10:00:00Z',
          user: { id: 'user-1', name: 'Max Mustermann', email: 'max@example.com' },
        },
      ];

      render(<AccessRequestsCard slug="test-club" />);

      const rejectButton = screen.getByTitle('Ablehnen');
      await user.click(rejectButton);

      await waitFor(() => {
        expect(screen.getByText('Anfrage ablehnen')).toBeInTheDocument();
      });
    });
  });
});
