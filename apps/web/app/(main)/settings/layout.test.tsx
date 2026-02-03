import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation
let mockPathname = "/settings";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

// Mock club store and permissions
vi.mock("@/lib/club-store", () => ({
  useActiveClub: () => null,
}));

vi.mock("@/lib/club-permissions", () => ({
  useCanManageSettings: () => false,
}));

// Import after mocks
import SettingsLayout from "./layout";

describe("SettingsLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/settings";
  });

  describe("sunshine path", () => {
    it("renders the settings title", () => {
      render(
        <SettingsLayout>
          <div>Test Content</div>
        </SettingsLayout>
      );

      expect(screen.getByText("Einstellungen")).toBeInTheDocument();
    });

    it("renders navigation items", () => {
      render(
        <SettingsLayout>
          <div>Test Content</div>
        </SettingsLayout>
      );

      expect(screen.getByRole("link", { name: /profil/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /meine vereine/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /benachrichtigungen/i })).toBeInTheDocument();
    });

    it("renders children content", () => {
      render(
        <SettingsLayout>
          <div data-testid="child-content">Test Child Content</div>
        </SettingsLayout>
      );

      expect(screen.getByTestId("child-content")).toBeInTheDocument();
      expect(screen.getByText("Test Child Content")).toBeInTheDocument();
    });

    it("has correct navigation links", () => {
      render(
        <SettingsLayout>
          <div>Content</div>
        </SettingsLayout>
      );

      expect(screen.getByRole("link", { name: /profil/i })).toHaveAttribute("href", "/settings/profile");
      expect(screen.getByRole("link", { name: /meine vereine/i })).toHaveAttribute(
        "href",
        "/settings/my-clubs"
      );
      expect(screen.getByRole("link", { name: /benachrichtigungen/i })).toHaveAttribute(
        "href",
        "/settings/notifications"
      );
    });
  });

  describe("edge cases", () => {
    it("highlights active profile nav item", () => {
      mockPathname = "/settings";

      render(
        <SettingsLayout>
          <div>Content</div>
        </SettingsLayout>
      );

      // The active button should have secondary variant
      const profileButton = screen.getByRole("button", { name: /profil/i });
      expect(profileButton).toBeInTheDocument();
    });

    it("highlights active clubs nav item", () => {
      mockPathname = "/settings/my-clubs";

      render(
        <SettingsLayout>
          <div>Content</div>
        </SettingsLayout>
      );

      const clubsButton = screen.getByRole("button", { name: /meine vereine/i });
      expect(clubsButton).toBeInTheDocument();
    });
  });
});
