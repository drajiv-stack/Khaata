"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function DesktopNav() {
  const pathname = usePathname()
  
  const navItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "+ New Entry", href: "/entry", isHighlight: true },
    { name: "Ledgers", href: "/ledger" },
    { name: "Chart of Accounts", href: "/accounts" },
    { name: "Audit Log", href: "/audit" },
  ]

  return (
    <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto text-base">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href)
        
        if (item.isHighlight) {
          return (
            <Link 
              key={item.href}
              href={item.href} 
              className={`block px-3 py-2 rounded-xl font-semibold transition-colors ${
                isActive ? "text-white bg-blue-600 shadow-md" : "text-[#007AFF] hover:bg-[#007AFF]/10"
              }`}
            >
              {item.name}
            </Link>
          )
        }

        return (
          <Link 
            key={item.href}
            href={item.href} 
            className={`block px-3 py-2 rounded-xl font-medium transition-colors ${
              isActive ? "text-[#007AFF] bg-[#007AFF]/10 font-bold" : "text-gray-700 hover:bg-black/5"
            }`}
          >
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}
