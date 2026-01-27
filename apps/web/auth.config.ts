import type { NextAuthConfig } from "next-auth"

/**
 * Auth.js configuration for middleware (Edge runtime).
 * This config must be Edge-compatible (no Node.js APIs, no Prisma).
 * Full configuration with adapter is in auth.ts.
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },

  // Providers are added in auth.ts (not Edge-compatible with OIDC discovery)
  providers: [],

  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const publicPaths = [
        "/login",
        "/register",
        "/forgot-password",
        "/impressum",
        "/datenschutz",
      ]
      const isPublicPath = publicPaths.some((path) =>
        nextUrl.pathname.startsWith(path)
      )
      const isAuthApi = nextUrl.pathname.startsWith("/api/auth")

      // Allow public paths and auth API
      if (isPublicPath || isAuthApi) {
        // Redirect logged-in users away from login page
        if (isLoggedIn && nextUrl.pathname === "/login") {
          return Response.redirect(new URL("/dashboard", nextUrl))
        }
        return true
      }

      // Protected routes require authentication
      if (!isLoggedIn) {
        return false // Will redirect to signIn page
      }

      return true
    },
  },
}
