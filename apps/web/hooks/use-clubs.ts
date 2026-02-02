import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { apiFetch } from "@/lib/api"
import { useClubStore, type ClubContext } from "@/lib/club-store"

/**
 * Query keys for club-related queries.
 * Following convention: [resource, ...identifiers]
 */
export const clubKeys = {
  all: ["clubs"] as const,
  my: () => [...clubKeys.all, "my"] as const,
  detail: (slug: string) => [...clubKeys.all, "detail", slug] as const,
  public: () => [...clubKeys.all, "public"] as const,
  checkSlug: (slug: string) => [...clubKeys.all, "check-slug", slug] as const,
  myRequests: () => [...clubKeys.all, "my-requests"] as const,
}

/**
 * API response type for /api/clubs/my
 */
interface ClubApiResponse {
  id: string
  name: string
  slug: string
  roles: string[]
  avatarUrl?: string
  avatarInitials?: string
  avatarColor?: string
}

interface MyClubsApiResponse {
  clubs: ClubApiResponse[]
  meta: {
    canCreateClub: boolean
  }
}

interface MyClubsResult {
  clubs: ClubContext[]
  canCreateClub: boolean
}

/**
 * Fetch user's clubs from API and transform to ClubContext.
 */
async function fetchMyClubs(): Promise<MyClubsResult> {
  const res = await apiFetch("/api/clubs/my")
  if (!res.ok) {
    throw new Error("Failed to fetch clubs")
  }
  const data: MyClubsApiResponse = await res.json()
  return {
    clubs: data.clubs.map((club) => ({
      id: club.id,
      name: club.name,
      slug: club.slug,
      roles: club.roles,
      avatarUrl: club.avatarUrl,
      avatarInitials: club.avatarInitials,
      avatarColor: club.avatarColor,
    })),
    canCreateClub: data.meta.canCreateClub,
  }
}

/**
 * Hook for fetching user's clubs.
 * Automatically deduplicates requests and caches results.
 *
 * @example
 * const { data, isLoading, error } = useMyClubsQuery()
 * const { clubs, canCreateClub } = data ?? { clubs: [], canCreateClub: false }
 */
export function useMyClubsQuery() {
  return useQuery({
    queryKey: clubKeys.my(),
    queryFn: fetchMyClubs,
    staleTime: 5 * 60 * 1000, // 5 Minuten - Clubs ändern sich selten
    gcTime: 10 * 60 * 1000, // 10 Minuten im Cache halten
  })
}

/**
 * Club detail API response
 */
interface ClubDetailResponse {
  id: string
  name: string
  slug: string
  description?: string
  visibility: "PUBLIC" | "PRIVATE"
  inviteCode?: string
  tier?: { name: string }
  userCount: number
  memberCount: number
}

/**
 * Hook for fetching a single club by slug.
 */
export function useClubQuery(slug: string) {
  return useQuery({
    queryKey: clubKeys.detail(slug),
    queryFn: async (): Promise<ClubDetailResponse> => {
      const res = await apiFetch(`/api/clubs/${slug}`)
      if (!res.ok) {
        throw new Error("Failed to fetch club")
      }
      return res.json()
    },
    staleTime: 60 * 1000, // Consider fresh for 60 seconds
    enabled: !!slug,
  })
}

/**
 * Hook for checking slug availability.
 */
export function useCheckSlugQuery(slug: string) {
  return useQuery({
    queryKey: clubKeys.checkSlug(slug),
    queryFn: async (): Promise<{ available: boolean; suggested?: string }> => {
      const res = await apiFetch(
        `/api/clubs/check-slug?slug=${encodeURIComponent(slug)}`
      )
      if (!res.ok) {
        throw new Error("Failed to check slug")
      }
      return res.json()
    },
    enabled: slug.length >= 3,
    staleTime: 10 * 1000, // Check more frequently
  })
}

/**
 * Hook for creating a new club.
 * Automatically invalidates the clubs list on success.
 */
export function useCreateClubMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      name: string
      slug?: string
      description?: string
      visibility: "PRIVATE" | "PUBLIC"
    }) => {
      const res = await apiFetch("/api/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || "Failed to create club")
      }
      return res.json()
    },
    onSuccess: () => {
      // Invalidate clubs list to refetch
      queryClient.invalidateQueries({ queryKey: clubKeys.my() })
    },
  })
}

/**
 * Access request type
 */
interface AccessRequest {
  id: string
  status: string
  createdAt: string
  club: {
    id: string
    name: string
    slug: string
  }
}

/**
 * Hook for fetching user's access requests.
 */
export function useMyAccessRequestsQuery() {
  return useQuery({
    queryKey: clubKeys.myRequests(),
    queryFn: async (): Promise<AccessRequest[]> => {
      const res = await apiFetch("/api/clubs/my-requests")
      if (!res.ok) {
        throw new Error("Failed to fetch requests")
      }
      return res.json()
    },
    staleTime: 2 * 60 * 1000, // 2 Minuten
    gcTime: 5 * 60 * 1000,
  })
}

/**
 * Hook for invalidating clubs cache.
 * Use after operations that modify club membership.
 */
export function useInvalidateClubs() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: clubKeys.all })
}

/**
 * Join club result type
 */
interface JoinClubResult {
  message: string
  status: "request_sent" | "pending" | "already_member"
  club?: {
    id: string
    name: string
    slug: string
  }
}

/**
 * Hook for joining a club with an invite code.
 * Automatically invalidates the clubs list on success.
 */
export function useJoinClubMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (code: string): Promise<JoinClubResult> => {
      const res = await apiFetch("/api/clubs/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || "Fehler beim Beitreten")
      }
      return data
    },
    onSuccess: (data) => {
      // Invalidate clubs list and access requests
      queryClient.invalidateQueries({ queryKey: clubKeys.my() })
      if (data.status === "request_sent") {
        queryClient.invalidateQueries({ queryKey: clubKeys.myRequests() })
      }
    },
  })
}

/**
 * Hook for leaving a club.
 * Automatically invalidates the clubs list on success.
 */
export function useLeaveClubMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (slug: string): Promise<{ message: string }> => {
      const res = await apiFetch(`/api/clubs/${slug}/leave`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || "Fehler beim Verlassen des Vereins")
      }
      return data
    },
    onSuccess: () => {
      // Invalidate clubs list to refetch
      queryClient.invalidateQueries({ queryKey: clubKeys.my() })
    },
  })
}

/**
 * Hook to sync clubs from API to the Zustand store.
 * Also auto-selects the first club if user has clubs but none is selected.
 * Call this in a layout or provider that wraps authenticated pages.
 */
export function useSyncClubsToStore() {
  const { data, isLoading } = useMyClubsQuery()
  const { clubs: apiClubs = [] } = data ?? {}
  const { activeClubSlug, setActiveClub, setClubs, clubs: storeClubs } = useClubStore()

  useEffect(() => {
    if (isLoading) return

    // Sync clubs to store
    if (apiClubs.length > 0) {
      // Only update if different (compare by JSON to avoid infinite loops)
      const apiJson = JSON.stringify(apiClubs)
      const storeJson = JSON.stringify(storeClubs)
      if (apiJson !== storeJson) {
        setClubs(apiClubs)
      }

      // Auto-select first club if none is selected
      if (!activeClubSlug) {
        setActiveClub(apiClubs[0].slug)
      }
      // If active club no longer exists, select first one
      else if (!apiClubs.find((c) => c.slug === activeClubSlug)) {
        setActiveClub(apiClubs[0].slug)
      }
    }
  }, [isLoading, apiClubs, storeClubs, activeClubSlug, setActiveClub, setClubs])
}
