import { auth, signOut } from "@/auth"
import Link from "next/link"
import { redirect } from "next/navigation"
import { DesktopNav } from "@/components/DesktopNav"
import { MobileNav } from "@/components/MobileNav"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <header className="md:hidden h-14 bg-[var(--card-bg)] border-b border-black/5 flex items-center justify-between px-4 sticky top-0 z-20 shadow-sm backdrop-blur-md bg-opacity-90">
        <h1 className="text-xl font-bold text-[#007AFF] tracking-tight">PumpLedger</h1>
        <div className="flex items-center space-x-3">
          <div className="text-right flex flex-col justify-center">
            <span className="text-sm font-semibold text-gray-900 leading-tight">{session.user.name}</span>
          </div>
          <form action={async () => { "use server"; await signOut(); }}>
            <button className="text-sm text-red-500 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 active:opacity-70 transition-opacity">
              Logout
            </button>
          </form>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-[var(--card-bg)] border-r border-black/5 flex-col">
        <div className="h-16 flex items-center px-6 border-b border-black/5">
          <h1 className="text-xl font-bold text-[#007AFF] tracking-tight">PumpLedger</h1>
        </div>
        
        <DesktopNav />

        <div className="p-6 border-t border-black/5">
          <div className="mb-4 px-2">
            <p className="text-base font-semibold text-gray-900">{session.user.name}</p>
            <p className="text-sm text-gray-500 font-medium">{session.user.role}</p>
          </div>
          <form
            action={async () => {
              "use server"
              await signOut()
            }}
          >
            <button className="w-full px-4 py-2 text-left text-base text-red-500 hover:bg-red-500/10 rounded-xl font-semibold transition-colors">
              Log out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] md:h-screen overflow-hidden relative pb-[84px] md:pb-0">
        <header className="hidden md:flex h-16 bg-[var(--card-bg)] border-b border-black/5 items-center px-8 z-10">
          <h2 className="text-base font-semibold text-gray-900">Workspace</h2>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8 bg-[var(--background)]">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  )
}
