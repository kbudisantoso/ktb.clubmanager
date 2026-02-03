import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

// Mock session hook
let mockSession: { user: { id: string; name: string; email: string } } | null = null;
let mockIsLoading = false;
vi.mock("@/hooks/use-session", () => ({
  useSessionQuery: () => ({ data: mockSession, isLoading: mockIsLoading }),
}));

// Import after mocks
import Home from "./page";

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
    mockIsLoading = false;
  });

  describe("sunshine path", () => {
    it("redirects authenticated users to dashboard", async () => {
      mockSession = {
        user: { id: "1", name: "Test User", email: "test@example.de" },
      };

      render(<Home />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/dashboard");
      });
    });

    it("redirects unauthenticated users to login", async () => {
      mockSession = null;

      render(<Home />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/login");
      });
    });
  });

  describe("edge cases", () => {
    it("shows loading state while session is pending", () => {
      mockIsLoading = true;
      mockSession = null;

      render(<Home />);

      expect(screen.getByText(/laden/i)).toBeInTheDocument();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("does not redirect while session is loading", () => {
      mockIsLoading = true;

      render(<Home />);

      expect(mockReplace).not.toHaveBeenCalled();
    });
  });
});
