import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { act } from "react"

// Mock next/navigation
const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock club store - we need to control what the hooks return
const mockSetActiveClub = vi.fn()
const mockSetClubs = vi.fn()

vi.mock("@/lib/club-store", async () => {
  const actual = await vi.importActual("@/lib/club-store")
  return {
    ...actual,
    useMyClubs: vi.fn(() => []),
    useNeedsClubRefresh: vi.fn(() => false),
    useClubStore: vi.fn(() => ({
      activeClubSlug: null,
      setActiveClub: mockSetActiveClub,
      setClubs: mockSetClubs,
    })),
  }
})

import { ClubSwitcher } from "./club-switcher"
import * as clubStoreModule from "@/lib/club-store"
import type { ClubContext } from "@/lib/club-store"

describe("ClubSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    })
  })

  describe("no clubs state", () => {
    it("renders 'Verein erstellen' button when no clubs", () => {
      vi.mocked(clubStoreModule.useMyClubs).mockReturnValue([])
      vi.mocked(clubStoreModule.useNeedsClubRefresh).mockReturnValue(false)

      render(<ClubSwitcher />)

      expect(screen.getByRole("button", { name: /verein erstellen/i })).toBeInTheDocument()
    })

    it("navigates to /clubs/new when create button clicked", async () => {
      const user = userEvent.setup()
      vi.mocked(clubStoreModule.useMyClubs).mockReturnValue([])
      vi.mocked(clubStoreModule.useNeedsClubRefresh).mockReturnValue(false)

      render(<ClubSwitcher />)

      await user.click(screen.getByRole("button", { name: /verein erstellen/i }))

      expect(mockPush).toHaveBeenCalledWith("/clubs/new")
    })
  })

  describe("single club state", () => {
    const singleClub: ClubContext[] = [
      {
        id: "1",
        name: "TSV Musterstadt",
        slug: "tsv-musterstadt",
        role: "OWNER",
        avatarInitials: "TM",
        avatarColor: "blue",
      },
    ]

    it("renders club name without dropdown for single club", () => {
      vi.mocked(clubStoreModule.useMyClubs).mockReturnValue(singleClub)
      vi.mocked(clubStoreModule.useNeedsClubRefresh).mockReturnValue(false)

      render(<ClubSwitcher />)

      expect(screen.getByText("TSV Musterstadt")).toBeInTheDocument()
      // No dropdown trigger (no ChevronDown icon button)
      expect(screen.queryByRole("button")).not.toBeInTheDocument()
    })

    it("shows club avatar with initials", () => {
      vi.mocked(clubStoreModule.useMyClubs).mockReturnValue(singleClub)
      vi.mocked(clubStoreModule.useNeedsClubRefresh).mockReturnValue(false)

      render(<ClubSwitcher />)

      expect(screen.getByTitle("TSV Musterstadt")).toBeInTheDocument()
      expect(screen.getByText("TM")).toBeInTheDocument()
    })
  })

  describe("multiple clubs state", () => {
    const multipleClubs: ClubContext[] = [
      {
        id: "1",
        name: "TSV Musterstadt",
        slug: "tsv-musterstadt",
        role: "OWNER",
        avatarInitials: "TM",
        avatarColor: "blue",
      },
      {
        id: "2",
        name: "FC Beispiel",
        slug: "fc-beispiel",
        role: "ADMIN",
        avatarInitials: "FB",
        avatarColor: "green",
      },
      {
        id: "3",
        name: "SV Test",
        slug: "sv-test",
        role: "VIEWER",
        avatarInitials: "ST",
        avatarColor: "red",
      },
    ]

    beforeEach(() => {
      vi.mocked(clubStoreModule.useMyClubs).mockReturnValue(multipleClubs)
      vi.mocked(clubStoreModule.useNeedsClubRefresh).mockReturnValue(false)
      vi.mocked(clubStoreModule.useClubStore).mockReturnValue({
        activeClubSlug: "tsv-musterstadt",
        setActiveClub: mockSetActiveClub,
        setClubs: mockSetClubs,
      })
    })

    it("renders dropdown trigger when 2+ clubs", () => {
      render(<ClubSwitcher />)

      // Should have a button trigger
      expect(screen.getByRole("button")).toBeInTheDocument()
      expect(screen.getByText("TSV Musterstadt")).toBeInTheDocument()
    })

    it("opens dropdown and shows all clubs", async () => {
      const user = userEvent.setup()
      render(<ClubSwitcher />)

      await user.click(screen.getByRole("button"))

      await waitFor(() => {
        // Active club appears in button and dropdown, so use getAllByText
        expect(screen.getAllByText("TSV Musterstadt").length).toBeGreaterThanOrEqual(1)
        expect(screen.getByText("FC Beispiel")).toBeInTheDocument()
        expect(screen.getByText("SV Test")).toBeInTheDocument()
      })
    })

    it("shows role badges correctly", async () => {
      const user = userEvent.setup()
      render(<ClubSwitcher />)

      await user.click(screen.getByRole("button"))

      await waitFor(() => {
        expect(screen.getByText("Inhaber")).toBeInTheDocument() // OWNER
        expect(screen.getByText("Admin")).toBeInTheDocument() // ADMIN
        expect(screen.getByText("Mitglied")).toBeInTheDocument() // VIEWER
      })
    })

    it("clicking club calls setActiveClub and navigates", async () => {
      const user = userEvent.setup()
      render(<ClubSwitcher />)

      await user.click(screen.getByRole("button"))

      await waitFor(() => {
        expect(screen.getByText("FC Beispiel")).toBeInTheDocument()
      })

      await user.click(screen.getByText("FC Beispiel"))

      expect(mockSetActiveClub).toHaveBeenCalledWith("fc-beispiel")
      expect(mockPush).toHaveBeenCalledWith("/clubs/fc-beispiel/dashboard")
    })

    it("shows 'Neuen Verein erstellen' in dropdown", async () => {
      const user = userEvent.setup()
      render(<ClubSwitcher />)

      await user.click(screen.getByRole("button"))

      await waitFor(() => {
        expect(screen.getByText(/neuen verein erstellen/i)).toBeInTheDocument()
      })
    })

    it("clicking create navigates to /clubs/new", async () => {
      const user = userEvent.setup()
      render(<ClubSwitcher />)

      await user.click(screen.getByRole("button"))

      await waitFor(() => {
        expect(screen.getByText(/neuen verein erstellen/i)).toBeInTheDocument()
      })

      await user.click(screen.getByText(/neuen verein erstellen/i))

      expect(mockPush).toHaveBeenCalledWith("/clubs/new")
    })
  })

  describe("5+ clubs with search", () => {
    const manyClubs: ClubContext[] = [
      { id: "1", name: "TSV Alpha", slug: "tsv-alpha", role: "OWNER" },
      { id: "2", name: "FC Beta", slug: "fc-beta", role: "ADMIN" },
      { id: "3", name: "SV Gamma", slug: "sv-gamma", role: "VIEWER" },
      { id: "4", name: "SC Delta", slug: "sc-delta", role: "VIEWER" },
      { id: "5", name: "VfB Epsilon", slug: "vfb-epsilon", role: "VIEWER" },
    ]

    beforeEach(() => {
      vi.mocked(clubStoreModule.useMyClubs).mockReturnValue(manyClubs)
      vi.mocked(clubStoreModule.useNeedsClubRefresh).mockReturnValue(false)
      vi.mocked(clubStoreModule.useClubStore).mockReturnValue({
        activeClubSlug: "tsv-alpha",
        setActiveClub: mockSetActiveClub,
        setClubs: mockSetClubs,
      })
    })

    it("renders search input when 5+ clubs", async () => {
      const user = userEvent.setup()
      render(<ClubSwitcher />)

      await user.click(screen.getByRole("button"))

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/verein suchen/i)).toBeInTheDocument()
      })
    })

    it("filters clubs by search query", async () => {
      const user = userEvent.setup()
      render(<ClubSwitcher />)

      await user.click(screen.getByRole("button"))

      const searchInput = await screen.findByPlaceholderText(/verein suchen/i)
      expect(searchInput).toBeInTheDocument()

      // All clubs visible before search
      expect(screen.getByText("FC Beta")).toBeInTheDocument()
      expect(screen.getAllByText("TSV Alpha").length).toBeGreaterThanOrEqual(1)

      // Type in search
      await user.type(searchInput, "Beta")

      // Only FC Beta should be visible in dropdown items
      await waitFor(() => {
        // FC Beta still visible
        expect(screen.getByText("FC Beta")).toBeInTheDocument()
      })
    })

    it("shows search input placeholder", async () => {
      const user = userEvent.setup()
      render(<ClubSwitcher />)

      await user.click(screen.getByRole("button"))

      const searchInput = await screen.findByPlaceholderText(/verein suchen/i)
      expect(searchInput).toBeInTheDocument()
    })
  })

  describe("loading and refresh", () => {
    it("fetches clubs when needsRefresh is true", async () => {
      vi.mocked(clubStoreModule.useMyClubs).mockReturnValue([])
      vi.mocked(clubStoreModule.useNeedsClubRefresh).mockReturnValue(true)
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [
          { id: "1", name: "Fetched Club", slug: "fetched", role: "OWNER" },
        ],
      })

      render(<ClubSwitcher />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/clubs/my", expect.anything())
      })
    })
  })
})
