import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation
let mockParams = { slug: "test-club" };
vi.mock("next/navigation", () => ({
  useParams: () => mockParams,
}));

// Import client component for testing (server component is async and can't be tested directly)
import { SettingsContent } from "./_client";

describe("SettingsContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { slug: "test-club" };
  });

  describe("sunshine path", () => {
    it("renders the general settings card title", () => {
      render(<SettingsContent />);

      expect(screen.getByText("Allgemein")).toBeInTheDocument();
    });

    it("shows general settings card description", () => {
      render(<SettingsContent />);

      expect(screen.getByText("Grundlegende Einstellungen für deinen Verein")).toBeInTheDocument();
    });

    it("shows placeholder message about future implementation", () => {
      render(<SettingsContent />);

      expect(
        screen.getByText(/vereinseinstellungen werden in phase 9/i)
      ).toBeInTheDocument();
    });
  });
});
