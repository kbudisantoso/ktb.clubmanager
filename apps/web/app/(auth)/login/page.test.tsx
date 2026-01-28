import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush }),
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => (
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock auth client
const mockSignInEmail = vi.fn();
const mockSignInSocial = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      email: (...args: unknown[]) => mockSignInEmail(...args),
      social: (...args: unknown[]) => mockSignInSocial(...args),
    },
  },
}));

// Mock broadcast auth
vi.mock("@/lib/broadcast-auth", () => ({
  getAuthBroadcast: () => ({
    notifyLogin: vi.fn(),
  }),
}));

// Import component after mocks
import LoginPage from "./page";

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete("signedOut");
    mockSearchParams.delete("callbackUrl");
    // Reset window.location
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
    });
  });

  describe("sunshine path", () => {
    it("renders the login form", async () => {
      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /willkommen/i })).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/e-mail-adresse/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /weiter/i })).toBeInTheDocument();
    });

    it("allows entering email and proceeding to password step", async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/e-mail-adresse/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/e-mail-adresse/i), "test@example.de");
      await user.click(screen.getByRole("button", { name: /weiter/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/passwort/i)).toBeInTheDocument();
      });
      expect(screen.getByRole("heading", { name: /passwort eingeben/i })).toBeInTheDocument();
    });

    it("successfully signs in with valid credentials", async () => {
      const user = userEvent.setup();
      mockSignInEmail.mockResolvedValue({ data: { session: {} }, error: null });

      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/e-mail-adresse/i)).toBeInTheDocument();
      });

      // Enter email
      await user.type(screen.getByLabelText(/e-mail-adresse/i), "test@example.de");
      await user.click(screen.getByRole("button", { name: /weiter/i }));

      // Enter password and submit
      await waitFor(() => {
        expect(screen.getByLabelText(/passwort/i)).toBeInTheDocument();
      });
      await user.type(screen.getByLabelText(/passwort/i), "password123");
      await user.click(screen.getByRole("button", { name: /anmelden/i }));

      await waitFor(() => {
        expect(mockSignInEmail).toHaveBeenCalledWith({
          email: "test@example.de",
          password: "password123",
        });
      });
    });

    it("shows signed out message when signedOut param is true", async () => {
      mockSearchParams.set("signedOut", "true");
      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByText(/erfolgreich abgemeldet/i)).toBeInTheDocument();
      });
    });
  });

  describe("edge cases", () => {
    it("allows going back from password step to email step", async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = await screen.findByLabelText(/e-mail-adresse/i);
      await user.type(emailInput, "test@example.de");
      await user.click(screen.getByRole("button", { name: /weiter/i }));

      // Wait for password step
      await screen.findByLabelText(/passwort/i);

      // Go back - click on email address button
      const backButton = screen.getByText("test@example.de");
      await user.click(backButton);

      // Wait for email step to return
      await screen.findByLabelText(/e-mail-adresse/i);
    });
  });

  describe("error cases", () => {
    it("shows error for invalid credentials", async () => {
      const user = userEvent.setup();
      mockSignInEmail.mockResolvedValue({
        data: null,
        error: { message: "Invalid credentials" },
      });

      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/e-mail-adresse/i)).toBeInTheDocument();
      });

      // Enter email
      await user.type(screen.getByLabelText(/e-mail-adresse/i), "test@example.de");
      await user.click(screen.getByRole("button", { name: /weiter/i }));

      // Enter password and submit
      await waitFor(() => {
        expect(screen.getByLabelText(/passwort/i)).toBeInTheDocument();
      });
      await user.type(screen.getByLabelText(/passwort/i), "wrongpassword");
      await user.click(screen.getByRole("button", { name: /anmelden/i }));

      await waitFor(() => {
        expect(screen.getByText(/falsch/i)).toBeInTheDocument();
      });
    });

    it("handles API errors gracefully", async () => {
      const user = userEvent.setup();
      mockSignInEmail.mockRejectedValue(new Error("Network error"));

      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/e-mail-adresse/i)).toBeInTheDocument();
      });

      // Enter email
      await user.type(screen.getByLabelText(/e-mail-adresse/i), "test@example.de");
      await user.click(screen.getByRole("button", { name: /weiter/i }));

      // Enter password and submit
      await waitFor(() => {
        expect(screen.getByLabelText(/passwort/i)).toBeInTheDocument();
      });
      await user.type(screen.getByLabelText(/passwort/i), "password123");
      await user.click(screen.getByRole("button", { name: /anmelden/i }));

      await waitFor(() => {
        expect(screen.getByText(/fehler ist aufgetreten/i)).toBeInTheDocument();
      });
    });
  });

  describe("navigation links", () => {
    it("has link to registration page", async () => {
      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByRole("link", { name: /jetzt registrieren/i })).toHaveAttribute(
          "href",
          "/register"
        );
      });
    });

    it("has link to forgot password page", async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/e-mail-adresse/i)).toBeInTheDocument();
      });

      // Go to password step to see the forgot password link
      await user.type(screen.getByLabelText(/e-mail-adresse/i), "test@example.de");
      await user.click(screen.getByRole("button", { name: /weiter/i }));

      await waitFor(() => {
        expect(screen.getByRole("link", { name: /passwort vergessen/i })).toHaveAttribute(
          "href",
          "/forgot-password"
        );
      });
    });

    it("has link to privacy policy", async () => {
      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByRole("link", { name: /datenschutz/i })).toHaveAttribute(
          "href",
          "/datenschutz"
        );
      });
    });
  });
});
