import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn(() => Promise.resolve(new Headers())),
}))

// Mock next/navigation
const mockRedirect = vi.fn()
const mockNotFound = vi.fn()
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url)
    throw new Error("NEXT_REDIRECT")
  },
  notFound: () => {
    mockNotFound()
    throw new Error("NEXT_NOT_FOUND")
  },
}))

// Mock auth
const mockGetSession = vi.fn()
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}))

// Mock prisma
const mockFindFirst = vi.fn()
vi.mock("@/lib/prisma", () => ({
  prisma: {
    clubUser: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}))

// Import after mocks
import { checkClubAccess } from "./check-club-access"

describe("checkClubAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("authentication", () => {
    it("redirects to login when user is not authenticated", async () => {
      mockGetSession.mockResolvedValue(null)

      await expect(checkClubAccess("test-club")).rejects.toThrow("NEXT_REDIRECT")

      expect(mockRedirect).toHaveBeenCalledWith("/login?callbackUrl=/clubs/test-club/dashboard")
    })

    it("redirects to login with correct callback URL for different slugs", async () => {
      mockGetSession.mockResolvedValue(null)

      await expect(checkClubAccess("my-awesome-club")).rejects.toThrow("NEXT_REDIRECT")

      expect(mockRedirect).toHaveBeenCalledWith("/login?callbackUrl=/clubs/my-awesome-club/dashboard")
    })

    it("redirects when session has no user", async () => {
      mockGetSession.mockResolvedValue({ user: null })

      await expect(checkClubAccess("test-club")).rejects.toThrow("NEXT_REDIRECT")

      expect(mockRedirect).toHaveBeenCalled()
    })
  })

  describe("access control", () => {
    it("returns 404 when user has no access to club", async () => {
      mockGetSession.mockResolvedValue({ user: { id: "user-1" } })
      mockFindFirst.mockResolvedValue(null)

      await expect(checkClubAccess("test-club")).rejects.toThrow("NEXT_NOT_FOUND")

      expect(mockNotFound).toHaveBeenCalled()
    })

    it("returns 404 when club does not exist", async () => {
      mockGetSession.mockResolvedValue({ user: { id: "user-1" } })
      mockFindFirst.mockResolvedValue(null)

      await expect(checkClubAccess("non-existent")).rejects.toThrow("NEXT_NOT_FOUND")

      expect(mockNotFound).toHaveBeenCalled()
    })

    it("returns club info when user has access", async () => {
      const mockClub = { id: "club-1", name: "Test Club", slug: "test-club" }
      const mockClubUser = {
        club: mockClub,
        roles: ["OWNER"],
      }
      mockGetSession.mockResolvedValue({ user: { id: "user-1" } })
      mockFindFirst.mockResolvedValue(mockClubUser)

      const result = await checkClubAccess("test-club")

      expect(result).toEqual({
        club: mockClub,
        roles: ["OWNER"],
        userId: "user-1",
      })
    })

    it("returns correct roles for member", async () => {
      const mockClub = { id: "club-1", name: "Test Club", slug: "test-club" }
      const mockClubUser = {
        club: mockClub,
        roles: ["MEMBER"],
      }
      mockGetSession.mockResolvedValue({ user: { id: "user-2" } })
      mockFindFirst.mockResolvedValue(mockClubUser)

      const result = await checkClubAccess("test-club")

      expect(result).toEqual({
        club: mockClub,
        roles: ["MEMBER"],
        userId: "user-2",
      })
    })
  })

  describe("database query", () => {
    it("queries for ACTIVE club users only", async () => {
      mockGetSession.mockResolvedValue({ user: { id: "user-1" } })
      mockFindFirst.mockResolvedValue(null)

      await expect(checkClubAccess("test-club")).rejects.toThrow()

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          club: {
            slug: "test-club",
            deletedAt: null,
          },
          status: "ACTIVE",
        },
        include: {
          club: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      })
    })

    it("excludes soft-deleted clubs", async () => {
      mockGetSession.mockResolvedValue({ user: { id: "user-1" } })
      mockFindFirst.mockResolvedValue(null)

      await expect(checkClubAccess("test-club")).rejects.toThrow()

      // Verify deletedAt: null is in the query
      const callArgs = mockFindFirst.mock.calls[0][0]
      expect(callArgs.where.club.deletedAt).toBeNull()
    })
  })
})
