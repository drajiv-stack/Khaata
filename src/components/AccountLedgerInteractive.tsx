"use client"

import { useState, useMemo } from "react"
import { reverseTransaction } from "@/app/actions/transaction"
import Link from "next/link"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useRouter } from "next/navigation"

type LedgerEntry = {
  id: string
  transactionId: string
  date: Date
  reference: string | null
  narration: string | null
  debit: number | null
  credit: number | null
  balance: number
  status: string
}

export default function AccountLedgerInteractive({ 
  account, 
  initialEntries, 
  currentBalance 
}: { 
  account: any
  initialEntries: LedgerEntry[]
  currentBalance: number
}) {
  const router = useRouter()
  const [filter, setFilter] = useState<'ALL' | 'MONTH' | 'YTD'>('ALL')
  const [viewMode, setViewMode] = useState<'TABLE' | 'CHART'>('TABLE')
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

  const chartData = useMemo(() => {
    return filteredEntries.map(e => ({
      name: new Date(e.date).toLocaleDateString(),
      balance: e.balance
    }))
  }, [filteredEntries])

  const handleReverse = async (transactionId: string) => {
    if (!confirm("Are you sure you want to reverse this transaction? This action will post an offsetting entry.")) return
    
    setLoadingRev(transactionId)
    const res = await reverseTransaction(transactionId, "Manual reversal from ledger")
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
        
        <div className="flex flex-col items-end space-y-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 px-6 py-4 flex flex-col items-end">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Balance</span>
            <span className={`text-2xl font-bold ${currentBalance < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
              ₹{currentBalance.toFixed(2)}
            </span>
          </div>
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
        
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button onClick={() => setViewMode('TABLE')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'TABLE' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Table</button>
          <button onClick={() => setViewMode('CHART')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'CHART' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Chart</button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden min-h-[400px]">
        {viewMode === 'CHART' ? (
          <div className="p-6 h-[400px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" fontSize={12} tickMargin={10} />
                  <YAxis fontSize={12} domain={['auto', 'auto']} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Balance']} />
                  <Line type="stepAfter" dataKey="balance" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500">No data for selected period</div>
            )}
          </div>
        ) : (
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No transactions found in this period.
                    </td>
                  </tr>
                ) : filteredEntries.map((entry) => (
                  <tr key={entry.id} className={`transition-colors ${entry.status === 'REVERSED' ? 'bg-red-50 dark:bg-red-900/10 opacity-75' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {entry.reference || '-'}
                      {entry.status === 'REVERSED' && <span className="ml-2 text-xs text-red-500 font-bold">(REVERSED)</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
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
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {entry.status === 'POSTED' && (
                        <button 
                          onClick={() => handleReverse(entry.transactionId)}
                          disabled={loadingRev === entry.transactionId}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                        >
                          {loadingRev === entry.transactionId ? 'Reversing...' : 'Reverse'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
