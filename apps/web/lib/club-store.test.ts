import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
})

// Import after localStorage mock is set up
import {
  useClubStore,
  useActiveClub,
  useMyClubs,
  useNeedsClubRefresh,
  type ClubContext,
  type TierFeatures,
} from "./club-store"

/** Default tier features for test fixtures */
const defaultFeatures: TierFeatures = { sepa: true, reports: true, bankImport: true }

/** Helper to create ClubContext with default permissions/features */
function createTestClub(partial: Omit<ClubContext, "permissions" | "features"> & Partial<Pick<ClubContext, "permissions" | "features">>): ClubContext {
  return {
    ...partial,
    permissions: partial.permissions ?? [],
    features: partial.features ?? defaultFeatures,
  }
}

describe("club-store", () => {
  beforeEach(() => {
    localStorage.clear()
    // Reset the store state
    useClubStore.setState({
      activeClubSlug: null,
      clubs: [],
      lastFetched: null,
    })
  })

  describe("useClubStore", () => {
    describe("setActiveClub()", () => {
      it("should update activeClubSlug", () => {
        const { result } = renderHook(() => useClubStore())

        act(() => {
          result.current.setActiveClub("test-club")
        })

        expect(result.current.activeClubSlug).toBe("test-club")
      })

      it("should allow setting active club multiple times", () => {
        const { result } = renderHook(() => useClubStore())

        act(() => {
          result.current.setActiveClub("club-one")
        })
        expect(result.current.activeClubSlug).toBe("club-one")

        act(() => {
          result.current.setActiveClub("club-two")
        })
        expect(result.current.activeClubSlug).toBe("club-two")
      })
    })

    describe("setClubs()", () => {
      it("should update clubs array", () => {
        const { result } = renderHook(() => useClubStore())

        const clubs: ClubContext[] = [
          createTestClub({ id: "1", name: "Club One", slug: "club-one", roles: ["OWNER"] }),
          createTestClub({ id: "2", name: "Club Two", slug: "club-two", roles: ["MEMBER"] }),
        ]

        act(() => {
          result.current.setClubs(clubs)
        })

        expect(result.current.clubs).toHaveLength(2)
        expect(result.current.clubs[0].name).toBe("Club One")
        expect(result.current.clubs[1].name).toBe("Club Two")
      })

      it("should update lastFetched timestamp", () => {
        const { result } = renderHook(() => useClubStore())

        const beforeTime = Date.now()

        act(() => {
          result.current.setClubs([createTestClub({ id: "1", name: "Club", slug: "club", roles: ["OWNER"] })])
        })

        const afterTime = Date.now()

        expect(result.current.lastFetched).toBeGreaterThanOrEqual(beforeTime)
        expect(result.current.lastFetched).toBeLessThanOrEqual(afterTime)
      })
    })

    describe("clearClubs()", () => {
      it("should reset all state", () => {
        const { result } = renderHook(() => useClubStore())

        // Set up some state
        act(() => {
          result.current.setClubs([createTestClub({ id: "1", name: "Club", slug: "club", roles: ["OWNER"] })])
          result.current.setActiveClub("club")
        })

        // Verify state is set
        expect(result.current.clubs).toHaveLength(1)
        expect(result.current.activeClubSlug).toBe("club")

        // Clear
        act(() => {
          result.current.clearClubs()
        })

        expect(result.current.clubs).toEqual([])
        expect(result.current.activeClubSlug).toBeNull()
        expect(result.current.lastFetched).toBeNull()
      })
    })

    describe("clearActiveClub()", () => {
      it("should clear only activeClubSlug", () => {
        const { result } = renderHook(() => useClubStore())

        act(() => {
          result.current.setClubs([createTestClub({ id: "1", name: "Club", slug: "club", roles: ["OWNER"] })])
          result.current.setActiveClub("club")
        })

        act(() => {
          result.current.clearActiveClub()
        })

        expect(result.current.activeClubSlug).toBeNull()
        expect(result.current.clubs).toHaveLength(1) // clubs still there
      })
    })
  })

  describe("useActiveClub()", () => {
    it("should return null when no active club", () => {
      const { result } = renderHook(() => useActiveClub())

      // Wait for hydration
      expect(result.current).toBeNull()
    })

    it("should return correct club after hydration", async () => {
      // Set up store state before rendering hook
      const clubs: ClubContext[] = [
        createTestClub({ id: "1", name: "Club One", slug: "club-one", roles: ["OWNER"] }),
        createTestClub({ id: "2", name: "Club Two", slug: "club-two", roles: ["MEMBER"] }),
      ]

      act(() => {
        useClubStore.setState({
          clubs,
          activeClubSlug: "club-one",
          lastFetched: Date.now(),
        })
      })

      const { result, rerender } = renderHook(() => useActiveClub())

      // Need to rerender to trigger hydration useEffect
      rerender()

      // After hydration, should return the active club
      expect(result.current).toEqual(createTestClub({
        id: "1",
        name: "Club One",
        slug: "club-one",
        roles: ["OWNER"],
      }))
    })

    it("should return null when activeClubSlug does not match any club", () => {
      act(() => {
        useClubStore.setState({
          clubs: [createTestClub({ id: "1", name: "Club One", slug: "club-one", roles: ["OWNER"] })],
          activeClubSlug: "nonexistent",
          lastFetched: Date.now(),
        })
      })

      const { result, rerender } = renderHook(() => useActiveClub())
      rerender()

      expect(result.current).toBeNull()
    })
  })

  describe("useMyClubs()", () => {
    it("should return empty array before hydration", () => {
      const { result } = renderHook(() => useMyClubs())

      // Before hydration effect runs
      expect(result.current).toEqual([])
    })

    it("should return all clubs after hydration", () => {
      const clubs: ClubContext[] = [
        createTestClub({ id: "1", name: "Club One", slug: "club-one", roles: ["OWNER"] }),
        createTestClub({ id: "2", name: "Club Two", slug: "club-two", roles: ["MEMBER"] }),
      ]

      act(() => {
        useClubStore.setState({
          clubs,
          activeClubSlug: null,
          lastFetched: Date.now(),
        })
      })

      const { result, rerender } = renderHook(() => useMyClubs())
      rerender()

      expect(result.current).toHaveLength(2)
      expect(result.current[0].name).toBe("Club One")
      expect(result.current[1].name).toBe("Club Two")
    })
  })

  describe("useNeedsClubRefresh()", () => {
    it("should return true when no clubs", () => {
      const { result } = renderHook(() => useNeedsClubRefresh())

      expect(result.current).toBe(true)
    })

    it("should return true when lastFetched is null", () => {
      act(() => {
        useClubStore.setState({
          clubs: [createTestClub({ id: "1", name: "Club", slug: "club", roles: ["OWNER"] })],
          activeClubSlug: null,
          lastFetched: null,
        })
      })

      const { result } = renderHook(() => useNeedsClubRefresh())

      expect(result.current).toBe(true)
    })

    it("should return true when data is older than 5 minutes", () => {
      const sixMinutesAgo = Date.now() - 6 * 60 * 1000

      act(() => {
        useClubStore.setState({
          clubs: [createTestClub({ id: "1", name: "Club", slug: "club", roles: ["OWNER"] })],
          activeClubSlug: null,
          lastFetched: sixMinutesAgo,
        })
      })

      const { result } = renderHook(() => useNeedsClubRefresh())

      expect(result.current).toBe(true)
    })

    it("should return false when data is fresh", () => {
      act(() => {
        useClubStore.setState({
          clubs: [createTestClub({ id: "1", name: "Club", slug: "club", roles: ["OWNER"] })],
          activeClubSlug: null,
          lastFetched: Date.now(),
        })
      })

      const { result } = renderHook(() => useNeedsClubRefresh())

      expect(result.current).toBe(false)
    })
  })
})
