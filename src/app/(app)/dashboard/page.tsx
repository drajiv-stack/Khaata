import { PrismaClient } from "@prisma/client"
import { auth } from "@/auth"

const prisma = new PrismaClient()

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await auth()
  
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
  
  const accounts = balancesRaw as any[]

  // Format balances based on normal side
  const formatBalance = (amount: any, normalSide: string) => {
    const val = Number(amount)
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Welcome back, {session?.user?.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {accounts.filter(a => a.code.startsWith('CASH') || a.code.startsWith('BANK') || a.code.startsWith('DIG')).map(account => (
          <div key={account.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{account.name}</h3>
            <p className={`mt-2 text-3xl font-semibold ${Number(account.balance) < 0 && account.normalSide === 'DEBIT' ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
              {formatBalance(account.balance, account.normalSide)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Recent Activity</h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">No recent transactions to display.</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Quick Actions</h2>
          <div className="space-y-3">
             <button className="w-full py-2 px-4 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-md hover:bg-blue-100 transition-colors text-left font-medium">
               + Enter Daily Shift Sales
             </button>
             <button className="w-full py-2 px-4 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-md hover:bg-green-100 transition-colors text-left font-medium">
               + Record Fuel Purchase
             </button>
             <button className="w-full py-2 px-4 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-md hover:bg-purple-100 transition-colors text-left font-medium">
               + Pay Supplier (OMC)
             </button>
          </div>
        </div>
      </div>
    </div>
  )
}
