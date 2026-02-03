import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock use-clubs hooks
const mockMutateAsync = vi.fn();
vi.mock("@/hooks/use-clubs", () => ({
  useMarkRequestSeenMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

// Import after mocks
import { RejectionNotice } from "./rejection-notice";
import type { AccessRequest } from "@/hooks/use-clubs";

function createMockRequest(overrides?: Partial<AccessRequest>): AccessRequest {
  return {
    id: "req-1",
    status: "REJECTED",
    createdAt: "2024-01-15T10:00:00Z",
    expiresAt: "2024-02-14T10:00:00Z",
    rejectionReason: "UNIDENTIFIED",
    club: {
      id: "club-1",
      name: "TSV Test",
      slug: "tsv-test",
      avatarInitials: "TT",
      avatarColor: "#6366f1",
    },
    ...overrides,
  };
}

describe("RejectionNotice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue(undefined);
  });

  describe("rendering", () => {
    it("renders rejection notice with club name", () => {
      render(<RejectionNotice request={createMockRequest()} />);

      expect(screen.getByText("TSV Test")).toBeInTheDocument();
    });

    it("shows the formatted date", () => {
      render(<RejectionNotice request={createMockRequest()} />);

      expect(screen.getByText(/15\.01\.2024/)).toBeInTheDocument();
    });

    it("displays club avatar initials", () => {
      render(<RejectionNotice request={createMockRequest()} />);

      expect(screen.getByText("TT")).toBeInTheDocument();
    });
  });

  describe("rejection reasons", () => {
    it.each([
      ["UNIDENTIFIED", "Zuordnung nicht möglich"],
      ["WRONG_CLUB", "Anderer Verein gesucht?"],
      ["BOARD_ONLY", "Zugang eingeschränkt"],
      ["CONTACT_DIRECTLY", "Direkter Kontakt gewünscht"],
      ["OTHER", "Anfrage nicht bestätigt"],
    ] as const)("displays correct title for %s reason", (reason, expectedTitle) => {
      render(
        <RejectionNotice
          request={createMockRequest({ rejectionReason: reason })}
        />
      );

      expect(screen.getByText(expectedTitle)).toBeInTheDocument();
    });

    it("shows rejection note when provided", () => {
      render(
        <RejectionNotice
          request={createMockRequest({
            rejectionReason: "OTHER",
            rejectionNote: "Bitte melde dich telefonisch",
          })}
        />
      );

      expect(
        screen.getByText(/"Bitte melde dich telefonisch"/)
      ).toBeInTheDocument();
    });

    it("does not show note section when no note provided", () => {
      render(
        <RejectionNotice
          request={createMockRequest({ rejectionNote: undefined })}
        />
      );

      expect(screen.queryByText(/Hinweis vom Verein/)).not.toBeInTheDocument();
    });
  });

  describe("dismiss action", () => {
    it("calls markAsSeen when clicking dismiss button", async () => {
      const user = userEvent.setup();

      render(<RejectionNotice request={createMockRequest()} />);

      const dismissButton = screen.getByTitle("Hinweis schließen");
      await user.click(dismissButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith("req-1");
      });
    });
  });

  describe("retry action", () => {
    it("shows retry button when onRetry is provided", () => {
      const onRetry = vi.fn();
      render(
        <RejectionNotice request={createMockRequest()} onRetry={onRetry} />
      );

      expect(screen.getByText("Erneut anfragen")).toBeInTheDocument();
    });

    it("does not show retry button when onRetry is not provided", () => {
      render(<RejectionNotice request={createMockRequest()} />);

      expect(screen.queryByText("Erneut anfragen")).not.toBeInTheDocument();
    });

    it("calls onRetry when clicking retry button", async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();

      render(
        <RejectionNotice request={createMockRequest()} onRetry={onRetry} />
      );

      await user.click(screen.getByText("Erneut anfragen"));

      expect(onRetry).toHaveBeenCalled();
    });
  });

  describe("re-request info", () => {
    it("shows info that user can request again", () => {
      render(<RejectionNotice request={createMockRequest()} />);

      expect(
        screen.getByText(/Du kannst jederzeit eine neue Anfrage stellen/)
      ).toBeInTheDocument();
    });
  });
});
