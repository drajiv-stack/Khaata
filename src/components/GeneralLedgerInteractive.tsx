"use client"

import { useState, useMemo } from "react"
import { reverseTransaction } from "@/app/actions/transaction"
import Link from "next/link"
import { useRouter } from "next/navigation"

type GeneralEntry = {
  id: string
  date: Date
  reference: string | null
  narration: string | null
  status: string
  debits: number
  credits: number
  lines: {
    id: string
    accountName: string
    accountType: string
    amount: number
  }[]
}

export default function GeneralLedgerInteractive({ initialEntries }: { initialEntries: GeneralEntry[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<'ALL' | 'MONTH' | 'YTD'>('ALL')
  const [loadingRev, setLoadingRev] = useState<string | null>(null)

  const filteredEntries = useMemo(() => {
    const now = new Date()
    return initialEntries.filter(e => {
      const d = new Date(e.date)
      if (filter === 'MONTH') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      }
      if (filter === 'YTD') {
        return d.getFullYear() === now.getFullYear()
      }
      return true
    })
  }, [initialEntries, filter])

  const handleReverse = async (transactionId: string) => {
    if (!confirm("Are you sure you want to reverse this transaction? This action will post an offsetting entry.")) return
    
    setLoadingRev(transactionId)
    const res = await reverseTransaction(transactionId, "Manual reversal from general ledger")
    if (res.success) {
      router.refresh()
    } else {
      alert(res.error)
    }
    setLoadingRev(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">General Ledger</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Chronological view of all journal entries</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Link href="/entry" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 shadow-sm transition-colors">
            + New Entry
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          <button onClick={() => setFilter('ALL')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'ALL' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}>All Time</button>
          <button onClick={() => setFilter('YTD')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'YTD' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}>YTD</button>
          <button onClick={() => setFilter('MONTH')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'MONTH' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}>This Month</button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ref / Narration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accounts</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No transactions found in this period.
                  </td>
                </tr>
              ) : filteredEntries.map((entry) => (
                <tr key={entry.id} className={`transition-colors ${entry.status === 'REVERSED' ? 'bg-red-50 dark:bg-red-900/10 opacity-75' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white align-top">
                    {new Date(entry.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white align-top">
                    <div className="font-medium">{entry.reference || '-'}</div>
                    <div className="text-gray-500 dark:text-gray-400 mt-1 max-w-xs">{entry.narration}</div>
                    {entry.status === 'REVERSED' && <div className="mt-1 text-xs text-red-500 font-bold">(REVERSED)</div>}
                  </td>
                  <td className="px-6 py-4 text-sm align-top">
                    <div className="space-y-1">
                      {entry.lines.map(line => {
                        const isDebit = line.amount >= 0;
                        const absAmt = Math.abs(line.amount).toFixed(2);
                        return (
                          <div key={line.id} className="flex justify-between w-64 text-sm">
                            <span className={`${isDebit ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 pl-4'}`}>
                              {line.accountName}
                            </span>
                            <span className={`font-mono ${isDebit ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                              {isDebit ? absAmt : `(${absAmt})`}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium align-top">
                    {entry.status === 'POSTED' && (
                      <button 
                        onClick={() => handleReverse(entry.id)}
                        disabled={loadingRev === entry.id}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                      >
                        {loadingRev === entry.id ? 'Reversing...' : 'Reverse'}
                      </button>
                    )}
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
