import Link from "next/link"
import { PrismaClient } from "@prisma/client"
import { auth } from "@/auth"
import { DashboardCharts } from "@/components/DashboardCharts"

const prisma = new PrismaClient()

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await auth()
  
  let accounts: any[] = []
  let chartData: any[] = []
  let dbError: string | null = null

  try {
    const balancesRaw = await prisma.$queryRaw`
      SELECT a.id, a.code, a.name, a.type, a.normal_side as "normalSide",
             COALESCE(SUM(tl.amount), 0) as balance
      FROM accounts a
      LEFT JOIN transaction_lines tl ON a.id = tl.account_id
      LEFT JOIN transactions t ON tl.transaction_id = t.id AND t.status = 'POSTED'
      GROUP BY a.id, a.code, a.name, a.type, a.normal_side
    `
    accounts = balancesRaw as any[]

    // Fetch 7-day trend for Cash/Bank accounts
    const trendRaw = await prisma.$queryRaw`
      SELECT 
        DATE(t.date) as date_str,
        SUM(CASE WHEN tl.amount > 0 THEN tl.amount ELSE 0 END) as inflow,
        SUM(CASE WHEN tl.amount < 0 THEN ABS(tl.amount) ELSE 0 END) as outflow
      FROM transactions t
      JOIN transaction_lines tl ON t.id = tl.transaction_id
      JOIN accounts a ON tl.account_id = a.id
      WHERE t.status = 'POSTED' 
        AND (a.code LIKE 'CASH%' OR a.code LIKE 'BANK%' OR a.code LIKE 'DIG%')
        AND t.date >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY DATE(t.date)
      ORDER BY DATE(t.date) ASC
    `
    
    // Format trend data for Recharts
    chartData = (trendRaw as any[]).map(row => {
      // row.date_str might come back as a string or Date object depending on pg driver
      const dateObj = new Date(row.date_str)
      return {
        date: dateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        inflow: Number(row.inflow?.toString() || 0),
        outflow: Number(row.outflow?.toString() || 0)
      }
    })

  } catch (err: any) {
    dbError = err.message || "Unknown database error"
    console.error("Dashboard DB Error:", err)
  }

  const formatBalance = (amount: any, normalSide: string) => {
    const val = Number(amount?.toString() || 0)
    const displayVal = normalSide === 'CREDIT' ? -val : val
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(displayVal)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="mt-2 text-base text-gray-500 font-medium">Welcome back, {session?.user?.name}</p>
      </div>

      {dbError && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-600 text-sm font-medium">
          Error loading dashboard data: {dbError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {accounts.filter(a => a.code?.startsWith('CASH') || a.code?.startsWith('BANK') || a.code?.startsWith('DIG')).map(account => (
          <div key={account.id} className="bg-[var(--card-bg)] p-6 rounded-3xl shadow-sm border border-black/5 transition-transform hover:scale-[1.02]">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{account.name}</h3>
            <p className={`mt-2 text-3xl font-bold tracking-tight ${Number(account.balance) < 0 && account.normalSide === 'DEBIT' ? 'text-red-500' : 'text-gray-900'}`}>
              {formatBalance(account.balance, account.normalSide)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--card-bg)] p-6 rounded-3xl shadow-sm border border-black/5">
          <h2 className="text-xl font-bold mb-4 text-gray-900 tracking-tight">Cash & Bank Flow (7 Days)</h2>
          <DashboardCharts data={chartData} />
        </div>
        
        <div className="bg-[var(--card-bg)] p-6 rounded-3xl shadow-sm border border-black/5">
          <h2 className="text-xl font-bold mb-5 text-gray-900 tracking-tight">Quick Actions</h2>
          <div className="space-y-3 flex flex-col">
             <Link href="/entry?template=SALES" className="w-full py-4 md:py-3 px-5 bg-[#007AFF]/10 text-[#007AFF] rounded-2xl hover:bg-[#007AFF]/20 transition-colors text-left font-bold text-base shadow-sm">
               + Enter Daily Shift Sales
             </Link>
             <Link href="/entry?template=FUEL" className="w-full py-4 md:py-3 px-5 bg-emerald-500/10 text-emerald-600 rounded-2xl hover:bg-emerald-500/20 transition-colors text-left font-bold text-base shadow-sm">
               + Record Fuel Purchase
             </Link>
             <Link href="/entry?template=PAYMENT" className="w-full py-4 md:py-3 px-5 bg-indigo-500/10 text-indigo-600 rounded-2xl hover:bg-indigo-500/20 transition-colors text-left font-bold text-base shadow-sm">
               + Pay Supplier (OMC)
             </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
