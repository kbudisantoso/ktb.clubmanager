import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation
const mockPush = vi.fn();
let mockParams = { slug: "test-club" };
vi.mock("next/navigation", () => ({
  useParams: () => mockParams,
  useRouter: () => ({ push: mockPush }),
}));

// Mock session hook
let mockSession: { user: { id: string } } | null = null;
let mockSessionLoading = false;
vi.mock("@/hooks/use-session", () => ({
  useSessionQuery: () => ({ data: mockSession, isLoading: mockSessionLoading }),
}));

// Mock clubs hook
let mockClubs: Array<{ id: string; slug: string; name: string; roles: string[] }> = [];
let mockClubsLoading = false;
vi.mock("@/hooks/use-clubs", () => ({
  useMyClubsQuery: () => ({
    data: { clubs: mockClubs },
    isLoading: mockClubsLoading,
  }),
}));

// Mock club store
const mockSetActiveClub = vi.fn();
vi.mock("@/lib/club-store", () => ({
  useClubStore: () => ({
    setActiveClub: mockSetActiveClub,
  }),
}));

// Mock Header component to simplify tests
vi.mock("@/components/layout/header", () => ({
  Header: () => <header data-testid="mock-header">Header</header>,
}));

// Import after mocks
import ClubLayout from "./layout";

describe("ClubLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { slug: "test-club" };
    mockSession = null;
    mockSessionLoading = false;
    mockClubs = [];
    mockClubsLoading = false;
  });

  describe("sunshine path", () => {
    it("renders children when user has access", async () => {
      mockSession = { user: { id: "user-1" } };
      mockClubs = [{ id: "club-1", slug: "test-club", name: "Test Club", roles: ["OWNER"] }];

      render(
        <ClubLayout>
          <div data-testid="child-content">Club Content</div>
        </ClubLayout>
      );

      await waitFor(() => {
        expect(screen.getByTestId("child-content")).toBeInTheDocument();
      });
      expect(mockSetActiveClub).toHaveBeenCalledWith("test-club");
    });
  });

  describe("authentication", () => {
    it("redirects to login if not authenticated", async () => {
      mockSession = null;
      mockSessionLoading = false;

      render(
        <ClubLayout>
          <div>Content</div>
        </ClubLayout>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/login?callbackUrl=/clubs/test-club/dashboard");
      });
    });

    it("shows loading while session is pending", () => {
      mockSessionLoading = true;

      render(
        <ClubLayout>
          <div data-testid="child-content">Content</div>
        </ClubLayout>
      );

      // Should show loading spinner, not redirect
      expect(mockPush).not.toHaveBeenCalled();
      expect(screen.queryByTestId("child-content")).not.toBeInTheDocument();
    });
  });

  describe("access control", () => {
    it("redirects to dashboard if user lacks access", async () => {
      mockSession = { user: { id: "user-1" } };
      mockClubs = [{ id: "club-1", slug: "other-club", name: "Other Club", roles: ["OWNER"] }];

      render(
        <ClubLayout>
          <div>Content</div>
        </ClubLayout>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/dashboard");
      });
    });
  });

  describe("edge cases", () => {
    it("sets active club when access granted", async () => {
      mockSession = { user: { id: "user-1" } };
      mockClubs = [{ id: "club-1", slug: "test-club", name: "Test Club", roles: ["MEMBER"] }];

      render(
        <ClubLayout>
          <div data-testid="content">Content</div>
        </ClubLayout>
      );

      await waitFor(() => {
        expect(mockSetActiveClub).toHaveBeenCalledWith("test-club");
      });
    });

    it("does not render children while loading clubs", () => {
      mockSession = { user: { id: "user-1" } };
      mockClubsLoading = true;

      const { queryByTestId } = render(
        <ClubLayout>
          <div data-testid="child-content">Content</div>
        </ClubLayout>
      );

      expect(queryByTestId("child-content")).not.toBeInTheDocument();
    });
  });
});
