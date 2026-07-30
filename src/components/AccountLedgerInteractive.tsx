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
  currentBalance,
  from = "accounts"
}: { 
  account: any
  initialEntries: LedgerEntry[]
  currentBalance: number
  from?: string
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

  const handleDelete = async (transactionId: string) => {
    if (!confirm("Are you sure you want to PERMANENTLY DELETE this entry? This action cannot be undone.")) return
    setLoadingRev(transactionId)
    const { deleteTransaction } = await import("@/app/actions/transaction")
    const res = await deleteTransaction(transactionId)
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {account.code ? `${account.code} - ` : ''}{account.name}
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400 font-medium">
            {account.type.replace('_', ' ')} • Normal Side: {account.normalSide}
          </p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="text-right flex-1 md:flex-none">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Current Balance</p>
            <p className={`text-2xl font-bold tracking-tight ${currentBalance < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
              ₹{currentBalance.toFixed(2)}
            </p>
          </div>
          <Link href="/entry" className="px-5 py-4 md:py-2.5 bg-[#007AFF] dark:bg-[#0A84FF] text-white text-base font-bold rounded-2xl hover:opacity-90 shadow-sm transition-opacity text-center active:opacity-70">
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
        
        <div className="flex w-full md:w-auto space-x-2 bg-black/5 dark:bg-white/5 p-1 rounded-2xl">
          <button onClick={() => setViewMode('TABLE')} className={`flex-1 md:flex-none px-4 py-3 md:py-1.5 rounded-xl text-sm font-bold transition-all ${viewMode === 'TABLE' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-[#007AFF] dark:text-[#0A84FF]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Table</button>
          <button onClick={() => setViewMode('CHART')} className={`flex-1 md:flex-none px-4 py-3 md:py-1.5 rounded-xl text-sm font-bold transition-all ${viewMode === 'CHART' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-[#007AFF] dark:text-[#0A84FF]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Chart</button>
        </div>
      </div>

      <div className="bg-transparent md:bg-[var(--card-bg)] md:rounded-3xl md:shadow-sm md:border md:border-black/5 md:dark:border-white/5 overflow-hidden">
        {viewMode === 'CHART' ? (
          <div className="p-6 h-[400px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                  <XAxis dataKey="name" fontSize={12} tickMargin={10} axisLine={false} tickLine={false} stroke="#8E8E93" />
                  <YAxis fontSize={12} domain={['auto', 'auto']} tickFormatter={(val) => `₹${val}`} axisLine={false} tickLine={false} stroke="#8E8E93" />
                  <Tooltip 
                    formatter={(value: unknown) => [`₹${Number(value).toFixed(2)}`, 'Balance']}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', backgroundColor: 'var(--card-bg)' }}
                  />
                  <Line type="monotone" dataKey="balance" stroke="#007AFF" strokeWidth={3} dot={{ r: 4, fill: '#007AFF', strokeWidth: 2, stroke: 'var(--card-bg)' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500 text-sm font-medium">No data for selected period</div>
            )}
          </div>
        ) : (
          <div>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {filteredEntries.length === 0 ? (
                <div className="text-center text-sm font-medium text-gray-500 py-6">No transactions found.</div>
              ) : filteredEntries.map((entry) => (
                <div key={entry.id} className={`bg-[var(--card-bg)] p-5 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 transition-colors ${entry.status === 'REVERSED' ? 'opacity-70 bg-red-500/5' : ''}`}>
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold text-gray-900 dark:text-white truncate">{new Date(entry.date).toLocaleDateString()}</p>
                      <p className="text-xs font-bold text-gray-500 tracking-wide mt-0.5 truncate">{entry.reference || 'No Ref'}</p>
                    </div>
                    <div className="text-right shrink min-w-0">
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest truncate">Balance</p>
                      <p className={`text-base font-bold font-mono break-all ${entry.balance < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                        ₹{entry.balance.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <p className={`text-base font-medium mb-4 break-words ${entry.status === 'REVERSED' ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                    {entry.narration}
                  </p>
                  
                  <div className="flex justify-between items-end mt-4 border-t border-black/5 dark:border-white/5 pt-4 gap-2">
                    <div className="flex space-x-4 min-w-0">
                      {entry.debit !== null && (
                        <div className="shrink min-w-0">
                          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest truncate">Debit</p>
                          <p className="text-base font-bold text-gray-900 dark:text-white font-mono break-all">₹{entry.debit.toFixed(2)}</p>
                        </div>
                      )}
                      {entry.credit !== null && (
                        <div className="shrink min-w-0">
                          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest truncate">Credit</p>
                          <p className="text-base font-bold text-gray-900 dark:text-white font-mono break-all">₹{entry.credit.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                    {entry.status === 'POSTED' ? (
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleReverse(entry.transactionId)}
                          disabled={loadingRev === entry.transactionId}
                          className="text-amber-600 bg-amber-500/10 px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-50 active:opacity-70 transition-opacity"
                        >
                          {loadingRev === entry.transactionId ? '...' : 'Reverse'}
                        </button>
                        <button 
                          onClick={() => handleDelete(entry.transactionId)}
                          disabled={loadingRev === entry.transactionId}
                          className="text-red-500 bg-red-500/10 px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-50 active:opacity-70 transition-opacity"
                        >
                          {loadingRev === entry.transactionId ? '...' : 'Hard Delete'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-md tracking-widest">REVERSED</span>
                    )}
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
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Ref</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Narration</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Debit</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Credit</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Balance</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-[var(--card-bg)] divide-y divide-black/5 dark:divide-white/5">
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-sm font-medium text-gray-500">No transactions found.</td>
                    </tr>
                  ) : filteredEntries.map((entry) => (
                    <tr key={entry.id} className={`transition-colors ${entry.status === 'REVERSED' ? 'bg-red-500/5 opacity-70' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-500">
                        {entry.reference || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {entry.narration}
                        {entry.status === 'REVERSED' && <span className="ml-2 text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md">REVERSED</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-bold text-gray-900 dark:text-white">
                        {entry.debit !== null ? entry.debit.toFixed(2) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-bold text-gray-900 dark:text-white">
                        {entry.credit !== null ? entry.credit.toFixed(2) : '-'}
                      </td>
                      <td className={`px-6 py-4 text-sm text-right font-bold ${entry.balance < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                        {entry.balance.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        {entry.status === 'POSTED' && (
                          <div className="flex flex-col items-end space-y-2">
                            <button 
                              onClick={() => handleReverse(entry.transactionId)}
                              disabled={loadingRev === entry.transactionId}
                              className="text-amber-600 hover:text-amber-700 font-bold disabled:opacity-50 transition-colors"
                            >
                              {loadingRev === entry.transactionId ? '...' : 'Reverse'}
                            </button>
                            <button 
                              onClick={() => handleDelete(entry.transactionId)}
                              disabled={loadingRev === entry.transactionId}
                              className="text-red-500 hover:text-red-600 font-bold disabled:opacity-50 transition-colors"
                            >
                              {loadingRev === entry.transactionId ? '...' : 'Hard Delete'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      {/* Spacer for mobile bottom nav */}
      <div className="h-24 md:hidden" />
    </div>
  )
}
