"use client"

import { cn } from "@/lib/utils"

/**
 * Preset colors for club avatars.
 */
const AVATAR_COLORS: Record<string, string> = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  red: "bg-red-500",
  yellow: "bg-yellow-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
  indigo: "bg-indigo-500",
  cyan: "bg-cyan-500",
  orange: "bg-orange-500",
  gray: "bg-gray-500",
}

interface ClubAvatarProps {
  avatarUrl?: string
  avatarInitials?: string
  avatarColor?: string
  name: string
  size?: "sm" | "md" | "lg"
  className?: string
}

/**
 * Club avatar component showing either an image or initials with color.
 */
export function ClubAvatar({
  avatarUrl,
  avatarInitials,
  avatarColor = "blue",
  name,
  size = "md",
  className,
}: ClubAvatarProps) {
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base",
  }

  const bgColor = AVATAR_COLORS[avatarColor] || AVATAR_COLORS.blue

  // Generate initials from name if not provided
  const initials = avatarInitials || generateInitials(name)

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        className={cn(
          "rounded-md object-cover",
          sizeClasses[size],
          className
        )}
      />
    )
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-md text-white font-medium",
        sizeClasses[size],
        bgColor,
        className
      )}
      title={name}
    >
      {initials}
    </div>
  )
}

function generateInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}
