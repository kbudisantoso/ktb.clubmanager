export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Background is in root layout - auth pages just need content wrapper
  return (
    <div className="relative min-h-screen flex flex-col">
      <main className="flex-1">{children}</main>
    </div>
  )
}
