"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function MobileNav() {
  const pathname = usePathname()
  
  const navItems = [
    { name: "Dash", href: "/dashboard" },
    { name: "Entry", href: "/entry", isHighlight: true },
    { name: "Ledger", href: "/ledger" },
    { name: "COA", href: "/accounts" },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[84px] pb-6 bg-[var(--card-bg)] border-t border-black/5 flex justify-around items-center z-30 px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] backdrop-blur-xl bg-opacity-90">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href)
        
        if (item.isHighlight) {
          return (
            <Link 
              key={item.href}
              href={item.href} 
              className={`flex flex-col items-center justify-center w-full h-full ${
                isActive ? "text-blue-600" : "text-[#007AFF]"
              }`}
            >
              <div className={`p-2.5 rounded-full mb-1 transition-colors ${
                isActive ? "bg-blue-600 text-white shadow-md" : "bg-[#007AFF]/10"
              }`}>
                <span className="text-base font-bold leading-none">+</span>
              </div>
              <span className="text-[11px] font-bold tracking-wide">{item.name}</span>
            </Link>
          )
        }

        return (
          <Link 
            key={item.href}
            href={item.href} 
            className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
              isActive ? "text-[#007AFF]" : "text-gray-500 hover:text-[#007AFF]"
            }`}
          >
            <span className={`text-[11px] mt-1 tracking-wide ${isActive ? "font-bold" : "font-semibold"}`}>
              {item.name}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
