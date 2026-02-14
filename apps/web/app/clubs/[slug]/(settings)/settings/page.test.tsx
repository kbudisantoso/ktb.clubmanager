import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock next/navigation
const mockParams = { slug: 'test-club' };
vi.mock('next/navigation', () => ({
  useParams: () => mockParams,
}));

// Mock the settings hooks
const mockUseClubSettings = vi.fn();
const mockMutateAsync = vi.fn();
vi.mock('@/hooks/use-club-settings', () => ({
  useClubSettings: (...args: unknown[]) => mockUseClubSettings(...args),
  useUpdateClubSettings: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

// Import client component for testing (server component is async and can't be tested directly)
import { SettingsContent } from './_client';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('SettingsContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows loading spinner while data is being fetched', () => {
      mockUseClubSettings.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      render(<SettingsContent />, { wrapper: createWrapper() });

      // Loader2 renders as an SVG with animate-spin class
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message when data fails to load', () => {
      mockUseClubSettings.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
      });

      render(<SettingsContent />, { wrapper: createWrapper() });

      expect(screen.getByText('Einstellungen konnten nicht geladen werden.')).toBeInTheDocument();
    });
  });

  describe('success state', () => {
    it('renders settings form with all 7 section cards', () => {
      mockUseClubSettings.mockReturnValue({
        data: {
          id: '1',
          name: 'Testverein',
          slug: 'test-club',
          visibility: 'PUBLIC',
          isRegistered: false,
          isNonProfit: false,
          userCount: 1,
          memberCount: 0,
        },
        isLoading: false,
        error: null,
      });

      render(<SettingsContent />, { wrapper: createWrapper() });

      // Verify all 7 section cards render (some labels also appear in completeness checklist)
      expect(screen.getAllByText('Stammdaten').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Adresse & Kontakt').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Vereinsregister').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Steuerdaten').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Bankverbindung').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Vereinsvorgaben').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Sichtbarkeit')).toBeInTheDocument();
    });

    it('renders club name in the name input', () => {
      mockUseClubSettings.mockReturnValue({
        data: {
          id: '1',
          name: 'Testverein',
          slug: 'test-club',
          visibility: 'PUBLIC',
          isRegistered: false,
          isNonProfit: false,
          userCount: 1,
          memberCount: 0,
        },
        isLoading: false,
        error: null,
      });

      render(<SettingsContent />, { wrapper: createWrapper() });

      const nameInput = screen.getByLabelText(/vereinsname/i);
      expect(nameInput).toHaveValue('Testverein');
    });
  });
});
