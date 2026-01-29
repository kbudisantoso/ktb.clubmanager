import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Public routes that don't require authentication.
 */
const publicPaths = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/impressum",
  "/datenschutz",
  "/nutzungsbedingungen",
  "/api/auth", // Better Auth endpoints
]

/**
 * Check if path is public (doesn't require authentication).
 */
function isPublicPath(pathname: string): boolean {
  return publicPaths.some((path) => pathname.startsWith(path))
}

/**
 * Authentication middleware.
 *
 * Checks for Better Auth session cookie and redirects
 * unauthenticated users to login page.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Check for Better Auth session cookie
  // Better Auth uses "better-auth.session_token" by default
  const sessionCookie = request.cookies.get("better-auth.session_token")

  if (!sessionCookie) {
    // Redirect to login with callback URL
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  // Match all routes except:
  // - _next (Next.js internals)
  // - Static files (images, fonts, etc.)
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)",
  ],
}
