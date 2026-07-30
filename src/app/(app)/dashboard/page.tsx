import { PrismaClient } from "@prisma/client"
import { auth } from "@/auth"

const prisma = new PrismaClient()

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await auth()
  
  let accounts: any[] = []
  let dbError: string | null = null

  try {
    // Calculate balances by summing transaction lines for each account
    // Note: We use raw SQL for performance on aggregate queries
    const balancesRaw = await prisma.$queryRaw`
      SELECT a.id, a.code, a.name, a.type, a.normal_side as "normalSide",
             COALESCE(SUM(tl.amount), 0) as balance
      FROM accounts a
      LEFT JOIN transaction_lines tl ON a.id = tl.account_id
      LEFT JOIN transactions t ON tl.transaction_id = t.id AND t.status = 'POSTED'
      GROUP BY a.id, a.code, a.name, a.type, a.normal_side
    `
    accounts = balancesRaw as any[]
  } catch (err: any) {
    dbError = err.message || "Unknown database error"
    console.error("Dashboard DB Error:", err)
  }

  // Format balances based on normal side
  const formatBalance = (amount: any, normalSide: string) => {
    // Safely convert Prisma Decimal/BigInt to number
    const val = Number(amount?.toString() || 0)
    // If DEBIT normal side, positive means DEBIT balance.
    // In our system, positive is debit, negative is credit.
    // So if normalSide is CREDIT, we flip the sign for display.
    const displayVal = normalSide === 'CREDIT' ? -val : val
    
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(displayVal)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Dashboard</h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 font-medium">Welcome back, {session?.user?.name}</p>
      </div>

      {dbError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium">
          Error loading dashboard data: {dbError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {accounts.filter(a => a.code?.startsWith('CASH') || a.code?.startsWith('BANK') || a.code?.startsWith('DIG')).map(account => (
          <div key={account.id} className="bg-[var(--card-bg)] p-6 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 transition-transform hover:scale-[1.02]">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{account.name}</h3>
            <p className={`mt-2 text-3xl font-bold tracking-tight ${Number(account.balance) < 0 && account.normalSide === 'DEBIT' ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
              {formatBalance(account.balance, account.normalSide)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[var(--card-bg)] p-6 rounded-3xl shadow-sm border border-black/5 dark:border-white/5">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white tracking-tight">Recent Activity</h2>
          <div className="text-base text-gray-500 dark:text-gray-400 font-medium py-4">No recent transactions to display.</div>
        </div>
        
        <div className="bg-[var(--card-bg)] p-6 rounded-3xl shadow-sm border border-black/5 dark:border-white/5">
          <h2 className="text-xl font-bold mb-5 text-gray-900 dark:text-white tracking-tight">Quick Actions</h2>
          <div className="space-y-3">
             <button className="w-full py-4 md:py-3 px-5 bg-[#007AFF]/10 text-[#007AFF] dark:bg-[#0A84FF]/20 dark:text-[#0A84FF] rounded-2xl hover:bg-[#007AFF]/20 transition-colors text-left font-bold text-base shadow-sm">
               + Enter Daily Shift Sales
             </button>
             <button className="w-full py-4 md:py-3 px-5 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-2xl hover:bg-emerald-500/20 transition-colors text-left font-bold text-base shadow-sm">
               + Record Fuel Purchase
             </button>
             <button className="w-full py-4 md:py-3 px-5 bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 rounded-2xl hover:bg-indigo-500/20 transition-colors text-left font-bold text-base shadow-sm">
               + Pay Supplier (OMC)
             </button>
          </div>
        </div>
      </div>
    </div>
  )
}
