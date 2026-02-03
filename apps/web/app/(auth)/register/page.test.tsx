import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => (
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock auth client
const mockSignUpEmail = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signUp: {
      email: (...args: unknown[]) => mockSignUpEmail(...args),
    },
  },
}));

// Mock session hook
vi.mock("@/hooks/use-session", () => ({
  useSessionQuery: () => ({ data: null, isLoading: false }),
  useClearSession: () => vi.fn(),
}));

// Mock password validation - avoid loading zxcvbn
vi.mock("@/lib/password-validation", () => ({
  validatePassword: vi.fn().mockResolvedValue({
    valid: true,
    errors: [],
    strength: 4,
    suggestions: [],
  }),
  checkPasswordStrength: vi.fn().mockReturnValue({
    score: 4,
    warning: undefined,
    suggestions: [],
  }),
}));

// Mock PasswordStrength component to avoid zxcvbn import
vi.mock("@/components/auth/password-strength", () => ({
  PasswordStrength: () => null,
}));

// Mock broadcast auth
vi.mock("@/lib/broadcast-auth", () => ({
  getAuthBroadcast: () => ({
    notifyLogin: vi.fn(),
  }),
}));

// Import after mocks
import RegisterPage from "./page";
import { validatePassword } from "@/lib/password-validation";

const mockValidatePassword = vi.mocked(validatePassword);

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: password validation passes
    mockValidatePassword.mockResolvedValue({
      valid: true,
      errors: [],
      strength: 4,
      suggestions: [],
    });
  });

  describe("sunshine path", () => {
    it("renders the registration form", async () => {
      render(<RegisterPage />);

      expect(screen.getByRole("heading", { name: /konto erstellen/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/e-mail-adresse/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText("Passwort")).toBeInTheDocument();
      expect(screen.getByLabelText(/passwort bestätigen/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /konto erstellen/i })).toBeInTheDocument();
    });

    it("successfully registers a new user", async () => {
      const user = userEvent.setup();
      mockSignUpEmail.mockResolvedValue({ data: { user: {} }, error: null });

      render(<RegisterPage />);

      // Fill out the form
      await user.type(screen.getByLabelText(/e-mail-adresse/i), "test@example.de");
      await user.type(screen.getByLabelText(/name/i), "Test User");
      await user.type(screen.getByLabelText("Passwort"), "StrongP@ss123!");
      await user.type(screen.getByLabelText(/passwort bestätigen/i), "StrongP@ss123!");

      // Submit
      await user.click(screen.getByRole("button", { name: /konto erstellen/i }));

      // Verify API was called
      await waitFor(() => {
        expect(mockSignUpEmail).toHaveBeenCalledWith({
          email: "test@example.de",
          password: "StrongP@ss123!",
          name: "Test User",
        });
      });

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/konto erstellt/i)).toBeInTheDocument();
      });
    });

    it("registers with email as name when name is not provided", async () => {
      const user = userEvent.setup();
      mockSignUpEmail.mockResolvedValue({ data: { user: {} }, error: null });

      render(<RegisterPage />);

      // Fill form without name
      await user.type(screen.getByLabelText(/e-mail-adresse/i), "john@example.de");
      await user.type(screen.getByLabelText("Passwort"), "StrongP@ss123!");
      await user.type(screen.getByLabelText(/passwort bestätigen/i), "StrongP@ss123!");

      await user.click(screen.getByRole("button", { name: /konto erstellen/i }));

      await waitFor(() => {
        expect(mockSignUpEmail).toHaveBeenCalledWith({
          email: "john@example.de",
          password: "StrongP@ss123!",
          name: "john", // Uses email prefix
        });
      });
    });
  });

  describe("edge cases", () => {
    it("shows password mismatch error inline", async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      await user.type(screen.getByLabelText("Passwort"), "password1");
      await user.type(screen.getByLabelText(/passwort bestätigen/i), "password2");

      await waitFor(() => {
        expect(screen.getByText(/stimmen nicht überein/i)).toBeInTheDocument();
      });
    });

    it("has link back to login page", () => {
      render(<RegisterPage />);

      const backLink = screen.getByRole("link", { name: /zurück zur anmeldung/i });
      expect(backLink).toHaveAttribute("href", "/login");
    });

    it("has link to privacy policy", () => {
      render(<RegisterPage />);

      const privacyLinks = screen.getAllByRole("link", { name: /datenschutz/i });
      expect(privacyLinks[0]).toHaveAttribute("href", "/datenschutz");
    });
  });

  describe("error cases", () => {
    it("shows error for weak password", async () => {
      const user = userEvent.setup();
      mockValidatePassword.mockResolvedValue({
        valid: false,
        errors: ["Passwort ist zu schwach"],
        strength: 1,
        suggestions: [],
      });

      render(<RegisterPage />);

      await user.type(screen.getByLabelText(/e-mail-adresse/i), "test@example.de");
      await user.type(screen.getByLabelText("Passwort"), "weak");
      await user.type(screen.getByLabelText(/passwort bestätigen/i), "weak");

      await user.click(screen.getByRole("button", { name: /konto erstellen/i }));

      await waitFor(() => {
        expect(screen.getByText(/zu schwach/i)).toBeInTheDocument();
      });
    });

    it("shows error when user already exists", async () => {
      const user = userEvent.setup();
      mockSignUpEmail.mockResolvedValue({
        data: null,
        error: { code: "USER_ALREADY_EXISTS", message: "User already exists" },
      });

      render(<RegisterPage />);

      await user.type(screen.getByLabelText(/e-mail-adresse/i), "existing@example.de");
      await user.type(screen.getByLabelText("Passwort"), "StrongP@ss123!");
      await user.type(screen.getByLabelText(/passwort bestätigen/i), "StrongP@ss123!");

      await user.click(screen.getByRole("button", { name: /konto erstellen/i }));

      await waitFor(() => {
        expect(screen.getByText(/existiert bereits/i)).toBeInTheDocument();
      });
    });

    it("handles API errors gracefully", async () => {
      const user = userEvent.setup();
      mockSignUpEmail.mockRejectedValue(new Error("Network error"));

      render(<RegisterPage />);

      await user.type(screen.getByLabelText(/e-mail-adresse/i), "test@example.de");
      await user.type(screen.getByLabelText("Passwort"), "StrongP@ss123!");
      await user.type(screen.getByLabelText(/passwort bestätigen/i), "StrongP@ss123!");

      await user.click(screen.getByRole("button", { name: /konto erstellen/i }));

      await waitFor(() => {
        expect(screen.getByText(/fehler ist aufgetreten/i)).toBeInTheDocument();
      });
    });

    it("shows generic error message for unknown API errors", async () => {
      const user = userEvent.setup();
      mockSignUpEmail.mockResolvedValue({
        data: null,
        error: { message: "Unknown error" },
      });

      render(<RegisterPage />);

      await user.type(screen.getByLabelText(/e-mail-adresse/i), "test@example.de");
      await user.type(screen.getByLabelText("Passwort"), "StrongP@ss123!");
      await user.type(screen.getByLabelText(/passwort bestätigen/i), "StrongP@ss123!");

      await user.click(screen.getByRole("button", { name: /konto erstellen/i }));

      await waitFor(() => {
        expect(screen.getByText(/unknown error/i)).toBeInTheDocument();
      });
    });
  });

  describe("loading state", () => {
    it("disables submit button while loading", async () => {
      const user = userEvent.setup();
      // Make the API call hang
      mockSignUpEmail.mockImplementation(() => new Promise(() => {}));

      render(<RegisterPage />);

      await user.type(screen.getByLabelText(/e-mail-adresse/i), "test@example.de");
      await user.type(screen.getByLabelText("Passwort"), "StrongP@ss123!");
      await user.type(screen.getByLabelText(/passwort bestätigen/i), "StrongP@ss123!");

      const submitButton = screen.getByRole("button", { name: /konto erstellen/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });
});
