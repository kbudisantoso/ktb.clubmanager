import { Header } from "@/components/layout/header"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* Subtle gradient background for in-app pages */}
      <div className="app-background" />

      <div className="relative min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
      </div>
    </>
  )
}
