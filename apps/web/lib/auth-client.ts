"use client"

import { createAuthClient } from "better-auth/react"

/**
 * Better Auth client for React components.
 *
 * Usage:
 * ```tsx
 * import { authClient, useSession } from "@/lib/auth-client"
 *
 * // In component:
 * const { data: session, isPending } = useSession()
 *
 * // Sign in:
 * await authClient.signIn.email({ email, password })
 *
 * // Sign out:
 * await authClient.signOut()
 * ```
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:33000",
})

// Export commonly used functions for convenience
export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient
