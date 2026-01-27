"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"
import { SessionProvider } from "next-auth/react"
import { useEffect } from "react"
import { getAuthBroadcast } from "@/lib/broadcast-auth"

/**
 * Theme provider wrapper for next-themes.
 * Exported for backward compatibility with existing imports.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

/**
 * AuthSyncProvider handles cross-tab authentication synchronization.
 * Listens for LOGOUT events from other tabs and redirects to login.
 * Listens for LOGIN events to redirect login page to dashboard.
 */
function AuthSyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const authBroadcast = getAuthBroadcast()

    // Handle logout from other tabs
    authBroadcast.on("LOGOUT", () => {
      // Clear local auth state
      authBroadcast.clearAuthState()
      // Redirect to login with signedOut parameter
      window.location.href = "/login?signedOut=true"
    })

    // Handle login from other tabs (for login page)
    authBroadcast.on("LOGIN", () => {
      // If we're on the login page, redirect to dashboard
      if (window.location.pathname === "/login") {
        const returnUrl = sessionStorage.getItem("ktb.returnUrl") || "/dashboard"
        window.location.href = returnUrl
      }
    })

    return () => {
      authBroadcast.disconnect()
    }
  }, [])

  return <>{children}</>
}

/**
 * Root providers component that wraps the application.
 * Includes SessionProvider for Auth.js, ThemeProvider for dark mode,
 * and AuthSyncProvider for cross-tab authentication sync.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AuthSyncProvider>{children}</AuthSyncProvider>
      </NextThemesProvider>
    </SessionProvider>
  )
}
