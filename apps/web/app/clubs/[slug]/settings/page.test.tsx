import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation
let mockParams = { slug: "test-club" };
vi.mock("next/navigation", () => ({
  useParams: () => mockParams,
}));

// Import after mocks
import ClubSettingsPage from "./page";

describe("ClubSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { slug: "test-club" };
  });

  describe("sunshine path", () => {
    it("renders the general settings card title", () => {
      render(<ClubSettingsPage />);

      expect(screen.getByText("Allgemein")).toBeInTheDocument();
    });

    it("shows general settings card description", () => {
      render(<ClubSettingsPage />);

      expect(screen.getByText("Grundlegende Einstellungen für deinen Verein")).toBeInTheDocument();
    });

    it("shows placeholder message about future implementation", () => {
      render(<ClubSettingsPage />);

      expect(
        screen.getByText(/vereinseinstellungen werden in phase 9/i)
      ).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("renders correctly with different slug", () => {
      mockParams = { slug: "another-club" };

      render(<ClubSettingsPage />);

      // Page should still render the same content - slug is not displayed
      expect(screen.getByText("Allgemein")).toBeInTheDocument();
    });
  });
});
