export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* Auth background with gradient overlay */}
      <div className="auth-background" />

      {/* Content without header */}
      <div className="relative min-h-screen flex flex-col">
        <main className="flex-1">{children}</main>
      </div>
    </>
  )
}
