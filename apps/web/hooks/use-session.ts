import { useQuery, useQueryClient } from "@tanstack/react-query"
import { authClient } from "@/lib/auth-client"

/**
 * Extended user type with custom fields
 */
export interface SessionUser {
  id: string
  email: string
  name?: string
  image?: string
  emailVerified: boolean
  isSuperAdmin?: boolean
}

export interface Session {
  user: SessionUser
  session: {
    id: string
    expiresAt: Date
  }
}

/**
 * Query keys for session
 */
export const sessionKeys = {
  all: ["session"] as const,
  current: () => [...sessionKeys.all, "current"] as const,
}

/**
 * Fetch session from Better Auth and enrich with user data from API
 */
async function fetchSession(): Promise<Session | null> {
  const result = await authClient.getSession()
  if (result.error || !result.data) {
    return null
  }

  const session = result.data as Session

  // Fetch additional user data including isSuperAdmin
  try {
    const res = await fetch("/api/users/me")
    if (res.ok) {
      const userData = await res.json()
      session.user = {
        ...session.user,
        isSuperAdmin: userData.isSuperAdmin ?? false,
      }
    }
  } catch {
    // If enrichment fails, continue with basic session
  }

  return session
}

/**
 * React Query hook for session data.
 * Caches session for 5 minutes to avoid repeated fetches.
 *
 * @example
 * const { data: session, isLoading } = useSessionQuery()
 * if (session?.user) { ... }
 */
export function useSessionQuery() {
  return useQuery({
    queryKey: sessionKeys.current(),
    queryFn: fetchSession,
    staleTime: 5 * 60 * 1000, // 5 Minuten - Session ändert sich selten
    gcTime: 10 * 60 * 1000, // 10 Minuten im Cache
    retry: false, // Nicht bei Auth-Fehlern wiederholen
  })
}

/**
 * Hook to invalidate session cache.
 * Call after login/logout.
 */
export function useInvalidateSession() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: sessionKeys.all })
}

/**
 * Hook to clear session from cache.
 * Call on logout.
 */
export function useClearSession() {
  const queryClient = useQueryClient()
  return () => queryClient.setQueryData(sessionKeys.current(), null)
}
