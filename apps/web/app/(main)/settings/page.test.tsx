import { describe, it, expect, vi } from "vitest";
import * as navigation from "next/navigation";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Import after mocks
import SettingsPage from "./page";

describe("SettingsPage", () => {
  it("redirects to /settings/profile", () => {
    SettingsPage();
    expect(navigation.redirect).toHaveBeenCalledWith("/settings/profile");
  });
});
