import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
let mockParams = { slug: 'test-club' };
vi.mock('next/navigation', () => ({
  useParams: () => mockParams,
}));

// Mock club store
let mockActiveClub: { role: string } | null = null;
vi.mock('@/lib/club-store', () => ({
  useActiveClub: () => mockActiveClub,
}));

// Mock club permissions
let mockCanManageSettings = false;
vi.mock('@/lib/club-permissions', () => ({
  useCanManageSettings: () => mockCanManageSettings,
}));

// Mock use-clubs hooks for AccessRequestsCard
vi.mock('@/hooks/use-clubs', () => ({
  useClubAccessRequestsQuery: () => ({
    data: [],
    isLoading: false,
  }),
  useApproveAccessRequestMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useRejectAccessRequestMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

// Mock clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined);
vi.stubGlobal('navigator', {
  ...navigator,
  clipboard: {
    writeText: mockWriteText,
  },
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocks - test the client component directly
import { ClubDashboardClient } from './_client';

describe('ClubDashboardClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { slug: 'test-club' };
    mockActiveClub = null;
    mockCanManageSettings = false;
    mockFetch.mockReset();
    mockWriteText.mockReset();
    mockWriteText.mockResolvedValue(undefined);
  });

  describe('sunshine path', () => {
    it('renders club name and info', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: '1',
            name: 'TSV Test',
            slug: 'test-club',
            visibility: 'PRIVATE',
            userCount: 5,
            memberCount: 100,
          }),
      });

      render(<ClubDashboardClient />);

      await waitFor(() => {
        expect(screen.getByText('TSV Test')).toBeInTheDocument();
      });
      expect(screen.getByText('Privat')).toBeInTheDocument();
    });

    it('shows quick action links', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: '1',
            name: 'TSV Test',
            slug: 'test-club',
            visibility: 'PRIVATE',
            userCount: 5,
            memberCount: 100,
          }),
      });

      render(<ClubDashboardClient />);

      await waitFor(() => {
        // Use getAllByText since "Mitglieder" appears in quick action AND stats
        expect(screen.getAllByText('Mitglieder').length).toBeGreaterThan(0);
      });
      expect(screen.getByText('Buchhaltung')).toBeInTheDocument();
    });

    it('displays statistics', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: '1',
            name: 'TSV Test',
            slug: 'test-club',
            visibility: 'PRIVATE',
            userCount: 5,
            memberCount: 100,
          }),
      });

      render(<ClubDashboardClient />);

      await waitFor(() => {
        expect(screen.getByText('Übersicht')).toBeInTheDocument();
      });
      expect(screen.getByText('5')).toBeInTheDocument(); // userCount
      expect(screen.getByText('100')).toBeInTheDocument(); // memberCount
    });

    it('shows public badge for public clubs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: '1',
            name: 'FC Public',
            slug: 'fc-public',
            visibility: 'PUBLIC',
            userCount: 10,
            memberCount: 200,
          }),
      });

      render(<ClubDashboardClient />);

      await waitFor(() => {
        expect(screen.getByText('Öffentlich')).toBeInTheDocument();
      });
    });

    it('shows tier badge if available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: '1',
            name: 'Premium Club',
            slug: 'premium-club',
            visibility: 'PRIVATE',
            tier: { name: 'Pro' },
            userCount: 20,
            memberCount: 500,
          }),
      });

      render(<ClubDashboardClient />);

      await waitFor(() => {
        expect(screen.getByText('Pro')).toBeInTheDocument();
      });
    });
  });

  describe('invite code section', () => {
    it('shows invite code for admins', async () => {
      mockActiveClub = { role: 'ADMIN' };
      mockCanManageSettings = true;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: '1',
            name: 'TSV Test',
            slug: 'test-club',
            visibility: 'PRIVATE',
            inviteCode: 'HXNK-4P9M',
            userCount: 5,
            memberCount: 100,
          }),
      });

      render(<ClubDashboardClient />);

      await waitFor(() => {
        expect(screen.getByText('Einladungscode')).toBeInTheDocument();
      });
      expect(screen.getByText('HXNK-4P9M')).toBeInTheDocument();
    });

    it('shows invite code for owners', async () => {
      mockActiveClub = { role: 'OWNER' };
      mockCanManageSettings = true;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: '1',
            name: 'TSV Test',
            slug: 'test-club',
            visibility: 'PRIVATE',
            inviteCode: 'ABCD-EFGH',
            userCount: 5,
            memberCount: 100,
          }),
      });

      render(<ClubDashboardClient />);

      await waitFor(() => {
        expect(screen.getByText('ABCD-EFGH')).toBeInTheDocument();
      });
    });

    it('hides invite code for viewers', async () => {
      mockActiveClub = { role: 'VIEWER' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: '1',
            name: 'TSV Test',
            slug: 'test-club',
            visibility: 'PRIVATE',
            inviteCode: 'HXNK-4P9M',
            userCount: 5,
            memberCount: 100,
          }),
      });

      render(<ClubDashboardClient />);

      await waitFor(() => {
        expect(screen.getByText('TSV Test')).toBeInTheDocument();
      });
      expect(screen.queryByText('Einladungscode')).not.toBeInTheDocument();
    });

    it('renders copy button for invite code', async () => {
      mockActiveClub = { role: 'OWNER' };
      mockCanManageSettings = true;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: '1',
            name: 'TSV Test',
            slug: 'test-club',
            visibility: 'PRIVATE',
            inviteCode: 'COPY-CODE',
            userCount: 5,
            memberCount: 100,
          }),
      });

      render(<ClubDashboardClient />);

      await waitFor(() => {
        expect(screen.getByText('COPY-CODE')).toBeInTheDocument();
      });

      // Copy buttons should be present (one for code, one for link)
      const copyButtons = screen.getAllByRole('button');
      expect(copyButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('edge cases', () => {
    it('shows loading state', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<ClubDashboardClient />);

      expect(screen.getByText('Laden...')).toBeInTheDocument();
    });

    it('displays description when available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: '1',
            name: 'TSV Test',
            slug: 'test-club',
            description: 'Ein toller Sportverein seit 1920',
            visibility: 'PRIVATE',
            userCount: 5,
            memberCount: 100,
          }),
      });

      render(<ClubDashboardClient />);

      await waitFor(() => {
        expect(screen.getByText('Ein toller Sportverein seit 1920')).toBeInTheDocument();
      });
    });

    it('handles no invite code gracefully', async () => {
      mockActiveClub = { role: 'OWNER' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: '1',
            name: 'Public Club',
            slug: 'public-club',
            visibility: 'PUBLIC',
            // No inviteCode
            userCount: 5,
            memberCount: 100,
          }),
      });

      render(<ClubDashboardClient />);

      await waitFor(() => {
        expect(screen.getByText('Public Club')).toBeInTheDocument();
      });
      expect(screen.queryByText('Einladungscode')).not.toBeInTheDocument();
    });
  });
});
