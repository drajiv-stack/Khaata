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
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">General Ledger</h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400 font-medium">Master chronological record of all transactions.</p>
        </div>
        <div className="w-full md:w-auto">
          <Link href="/entry" className="block w-full md:w-auto text-center px-5 py-4 md:py-2.5 bg-[#007AFF] dark:bg-[#0A84FF] text-white text-base font-bold rounded-2xl hover:opacity-90 shadow-sm transition-opacity active:opacity-70">
            + New Entry
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between bg-[var(--card-bg)] p-4 rounded-3xl shadow-sm border border-black/5 dark:border-white/5">
        <div className="flex w-full md:w-auto space-x-2 bg-black/5 dark:bg-white/5 p-1 rounded-2xl">
          <button onClick={() => setFilter('ALL')} className={`flex-1 md:flex-none px-4 py-3 md:py-1.5 rounded-xl text-sm font-bold transition-all ${filter === 'ALL' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>All Time</button>
          <button onClick={() => setFilter('YTD')} className={`flex-1 md:flex-none px-4 py-3 md:py-1.5 rounded-xl text-sm font-bold transition-all ${filter === 'YTD' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>YTD</button>
          <button onClick={() => setFilter('MONTH')} className={`flex-1 md:flex-none px-4 py-3 md:py-1.5 rounded-xl text-sm font-bold transition-all ${filter === 'MONTH' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Month</button>
        </div>
      </div>

      <div className="bg-transparent md:bg-[var(--card-bg)] md:rounded-3xl md:shadow-sm md:border md:border-black/5 md:dark:border-white/5 overflow-hidden md:min-h-[400px]">
        
        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {filteredEntries.length === 0 ? (
            <div className="text-center text-sm font-medium text-gray-500 py-6">No transactions found.</div>
          ) : filteredEntries.map((entry) => (
            <div key={entry.id} className={`bg-[var(--card-bg)] p-5 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 transition-colors ${entry.status === 'REVERSED' ? 'opacity-70 bg-red-500/5' : ''}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-base font-bold text-gray-900 dark:text-white">{new Date(entry.date).toLocaleDateString()}</p>
                  <p className="text-xs font-bold text-gray-500 tracking-wide mt-0.5">{entry.reference || 'No Ref'}</p>
                </div>
                {entry.status === 'POSTED' ? (
                  <button 
                    onClick={() => handleReverse(entry.id)}
                    disabled={loadingRev === entry.id}
                    className="text-red-500 bg-red-500/10 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 active:opacity-70 transition-opacity"
                  >
                    {loadingRev === entry.id ? '...' : 'Reverse'}
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-md tracking-widest">REVERSED</span>
                )}
              </div>
              <p className={`text-base font-medium mb-4 ${entry.status === 'REVERSED' ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                {entry.narration}
              </p>
              <div className="bg-gray-50 dark:bg-black/20 rounded-2xl p-4 space-y-3">
                {entry.lines.map(line => {
                  const isDebit = line.amount >= 0;
                  const absAmt = Math.abs(line.amount).toFixed(2);
                  return (
                    <div key={line.id} className="flex justify-between items-center text-base">
                      <span className={`${isDebit ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-500 font-medium pl-4'}`}>
                        {line.accountName}
                      </span>
                      <span className={`font-mono ${isDebit ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-500 font-medium'}`}>
                        {isDebit ? absAmt : `(${absAmt})`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-black/5 dark:divide-white/5">
            <thead className="bg-black/5 dark:bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Ref / Narration</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Accounts</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="bg-[var(--card-bg)] divide-y divide-black/5 dark:divide-white/5">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm font-medium text-gray-500">
                    No transactions found.
                  </td>
                </tr>
              ) : filteredEntries.map((entry) => (
                <tr key={entry.id} className={`transition-colors ${entry.status === 'REVERSED' ? 'bg-red-500/5 opacity-70' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white align-top">
                    {new Date(entry.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs align-top">
                    <div className="font-bold">{entry.reference || '-'}</div>
                    <div className={`text-gray-500 dark:text-gray-400 font-medium mt-1 ${entry.status === 'REVERSED' ? 'line-through' : ''}`}>
                      {entry.narration}
                      {entry.status === 'REVERSED' && <span className="ml-2 font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md text-[10px]">REVERSED</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 align-top">
                    <div className="space-y-1.5">
                      {entry.lines.map(line => {
                        const isDebit = line.amount >= 0;
                        const absAmt = Math.abs(line.amount).toFixed(2);
                        return (
                          <div key={line.id} className="flex justify-between w-64 text-sm">
                            <span className={`${isDebit ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-500 dark:text-gray-400 font-medium pl-4'}`}>
                              {line.accountName}
                            </span>
                            <span className={`font-mono ${isDebit ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-500 dark:text-gray-400 font-medium'}`}>
                              {isDebit ? absAmt : `(${absAmt})`}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {entry.status === 'POSTED' && (
                      <button 
                        onClick={() => handleReverse(entry.id)}
                        disabled={loadingRev === entry.id}
                        className="text-red-500 hover:text-red-600 font-bold disabled:opacity-50 transition-colors"
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
