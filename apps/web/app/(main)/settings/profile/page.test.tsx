import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock hooks
const mockUseSessionQuery = vi.fn();
vi.mock("@/hooks/use-session", () => ({
  useSessionQuery: () => mockUseSessionQuery(),
}));

// Import after mocks
import ProfilePage from "./page";

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sunshine path", () => {
    it("renders user profile information", () => {
      mockUseSessionQuery.mockReturnValue({
        data: {
          user: { id: "1", name: "Max Mustermann", email: "max@example.de" },
        },
        isLoading: false,
      });

      render(<ProfilePage />);

      expect(screen.getByText("Profil")).toBeInTheDocument();
      expect(screen.getByText("Deine persönlichen Informationen")).toBeInTheDocument();
      expect(screen.getByText("Max Mustermann")).toBeInTheDocument();
      expect(screen.getByText("max@example.de")).toBeInTheDocument();
    });

    it("displays user initials in avatar", () => {
      mockUseSessionQuery.mockReturnValue({
        data: {
          user: { id: "1", name: "Max Mustermann", email: "max@example.de" },
        },
        isLoading: false,
      });

      render(<ProfilePage />);

      // Avatar fallback should show initials "MM"
      expect(screen.getByText("MM")).toBeInTheDocument();
    });

    it("displays first letter of email when no name", () => {
      mockUseSessionQuery.mockReturnValue({
        data: {
          user: { id: "1", name: "", email: "max@example.de" },
        },
        isLoading: false,
      });

      render(<ProfilePage />);

      expect(screen.getByText("M")).toBeInTheDocument();
      expect(screen.getByText("Kein Name")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("shows loading state when session is loading", () => {
      mockUseSessionQuery.mockReturnValue({
        data: null,
        isLoading: true,
      });

      render(<ProfilePage />);

      // Skeleton should be visible (check for role or class)
      expect(document.querySelector('[data-slot="card"]')).toBeInTheDocument();
    });

    it("handles user with single name", () => {
      mockUseSessionQuery.mockReturnValue({
        data: {
          user: { id: "1", name: "Max", email: "max@example.de" },
        },
        isLoading: false,
      });

      render(<ProfilePage />);

      expect(screen.getByText("M")).toBeInTheDocument();
      expect(screen.getByText("Max")).toBeInTheDocument();
    });
  });
});
