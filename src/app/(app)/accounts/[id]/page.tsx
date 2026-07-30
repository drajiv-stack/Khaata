import { PrismaClient } from "@prisma/client"
import Link from "next/link"
import { notFound } from "next/navigation"

const prisma = new PrismaClient()
export const dynamic = "force-dynamic"

export default async function AccountLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const account = await prisma.account.findUnique({
    where: { id }
  })

  if (!account) {
    notFound()
  }

  // Fetch all transaction lines for this account
  const lines = await prisma.transactionLine.findMany({
    where: { 
      accountId: id,
      transaction: { status: 'POSTED' } 
    },
    include: { 
      transaction: {
        select: { date: true, reference: true, narration: true }
      } 
    },
    orderBy: [
      { transaction: { date: 'asc' } },
      { transactionId: 'asc' } // stable sort
    ]
  })

  // Calculate running balance
  let runningBalance = 0
  const ledgerEntries = lines.map(line => {
    const amt = Number(line.amount)
    runningBalance += amt
    
    // For display, we separate into Debit and Credit columns based on positive/negative amount
    const isDebit = amt >= 0
    const absAmount = Math.abs(amt)
    
    // Display running balance according to normal side
    const displayBalance = account.normalSide === 'CREDIT' ? -runningBalance : runningBalance
    
    return {
      id: line.id,
      date: line.transaction.date,
      reference: line.transaction.reference,
      narration: line.transaction.narration,
      debit: isDebit ? absAmount : null,
      credit: !isDebit ? absAmount : null,
      balance: displayBalance
    }
  })

  // Overall current display balance
  const currentBalance = account.normalSide === 'CREDIT' ? -runningBalance : runningBalance

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-2">
        <Link href="/accounts" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          ← Back to Accounts
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {account.code} - {account.name}
          </h1>
          <div className="mt-2 flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
            <span className="px-2.5 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {account.type.replace('_', ' ')}
            </span>
            <span>Normal Side: <strong>{account.normalSide}</strong></span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 px-6 py-4 flex flex-col items-end">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Balance</span>
          <span className={`text-2xl font-bold ${currentBalance < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
            ₹{currentBalance.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mt-8">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Narration</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit (₹)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit (₹)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance (₹)</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {ledgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No transactions found for this account.
                  </td>
                </tr>
              ) : ledgerEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {entry.date.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {entry.reference || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-md truncate">
                    {entry.narration}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white font-medium">
                    {entry.debit !== null ? entry.debit.toFixed(2) : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white font-medium">
                    {entry.credit !== null ? entry.credit.toFixed(2) : ''}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${entry.balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                    {entry.balance.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
