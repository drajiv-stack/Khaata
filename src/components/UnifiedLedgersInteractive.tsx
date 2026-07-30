"use client"

import { useState, useMemo } from "react"
import { reverseTransaction } from "@/app/actions/transaction"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell
} from "recharts"

type TransactionEntry = {
  id: string
  date: Date
  reference: string | null
  narration: string | null
  status: string
  debits: number
  credits: number
  lines: {
    id: string
    accountId: string
    accountName: string
    accountType: string
    amount: number
  }[]
}

type AccountSummary = {
  id: string
  code: string | null
  name: string
  type: string
  normalSide: string
  openingBalance: number
}

type Props = {
  initialEntries: TransactionEntry[]
  accounts: AccountSummary[]
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK: "Bank",
  DIGITAL_SETTLEMENT: "Digital Settlement",
  SUPPLIER: "Supplier",
  CUSTOMER: "Customer",
  INCOME: "Income",
  EXPENSE: "Expense",
  OWNER_EQUITY: "Owner Equity",
}

const CHART_COLORS = ["#007AFF", "#34C759", "#FF9500", "#FF3B30", "#AF52DE", "#5856D6", "#FF2D55", "#00C7BE"]

type ViewMode = "DATE" | "ACCOUNT" | "GRAPH"
type TimeFilter = "MONTH" | "TILL_DATE"

export default function UnifiedLedgersInteractive({ initialEntries, accounts }: Props) {
  const router = useRouter()
  const [view, setView] = useState<ViewMode>("DATE")
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("TILL_DATE")
  const [loadingRev, setLoadingRev] = useState<string | null>(null)
  const [expandedTxn, setExpandedTxn] = useState<string | null>(null)

  // Filter entries by time
  const filteredEntries = useMemo(() => {
    const now = new Date()
    return initialEntries.filter(e => {
      const d = new Date(e.date)
      if (timeFilter === "MONTH") {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      }
      return true // TILL_DATE = all
    })
  }, [initialEntries, timeFilter])

  // Account-wise balances
  const accountBalances = useMemo(() => {
    const balances = new Map<string, { account: AccountSummary; totalDebit: number; totalCredit: number; netBalance: number }>()

    // Initialize with opening balances
    accounts.forEach(acc => {
      balances.set(acc.id, {
        account: acc,
        totalDebit: 0,
        totalCredit: 0,
        netBalance: 0,
      })
    })

    // Accumulate from filtered entries
    filteredEntries.forEach(entry => {
      if (entry.status === "REVERSED") return
      entry.lines.forEach(line => {
        const rec = balances.get(line.accountId)
        if (rec) {
          const amt = line.amount
          if (amt >= 0) rec.totalDebit += amt
          else rec.totalCredit += Math.abs(amt)
          rec.netBalance += amt
        }
      })
    })

    // Compute display balance based on normalSide
    const result = Array.from(balances.values()).map(b => {
      const displayBalance = b.account.normalSide === "CREDIT"
        ? -(b.netBalance)
        : b.netBalance
      return {
        ...b,
        displayBalance: displayBalance + b.account.openingBalance,
      }
    })

    // Group by type
    const grouped: Record<string, typeof result> = {}
    result.forEach(r => {
      const type = r.account.type
      if (!grouped[type]) grouped[type] = []
      grouped[type].push(r)
    })
    return grouped
  }, [accounts, filteredEntries])

  // Graph data: Daily totals
  const dailyData = useMemo(() => {
    const map = new Map<string, { date: string; income: number; expense: number }>()
    filteredEntries.forEach(entry => {
      if (entry.status === "REVERSED") return
      const dateStr = new Date(entry.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
      if (!map.has(dateStr)) map.set(dateStr, { date: dateStr, income: 0, expense: 0 })
      const rec = map.get(dateStr)!
      entry.lines.forEach(line => {
        if (line.accountType === "INCOME") {
          rec.income += Math.abs(line.amount)
        } else if (line.accountType === "EXPENSE") {
          rec.expense += Math.abs(line.amount)
        }
      })
    })
    return Array.from(map.values())
  }, [filteredEntries])

  // Pie data: Balance by account type
  const pieData = useMemo(() => {
    const result: { name: string; value: number }[] = []
    Object.entries(accountBalances).forEach(([type, accs]) => {
      if (type === "INCOME" || type === "EXPENSE") return // skip P&L for balance pie
      const total = accs.reduce((sum, a) => sum + Math.abs(a.displayBalance), 0)
      if (total > 0) {
        result.push({ name: ACCOUNT_TYPE_LABELS[type] || type, value: Math.round(total * 100) / 100 })
      }
    })
    return result
  }, [accountBalances])

  // Running totals for summary cards
  const summaryStats = useMemo(() => {
    let totalDebits = 0
    let totalCredits = 0
    let txnCount = 0
    filteredEntries.forEach(e => {
      if (e.status === "REVERSED") return
      totalDebits += e.debits
      totalCredits += e.credits
      txnCount++
    })
    return { totalDebits, totalCredits, txnCount }
  }, [filteredEntries])

  const handleReverse = async (transactionId: string) => {
    if (!confirm("Are you sure you want to reverse this transaction?")) return
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
    setLoadingRev(transactionId) // Reuse loading state
    const { deleteTransaction } = await import("@/app/actions/transaction")
    const res = await deleteTransaction(transactionId)
    if (res.success) {
      router.refresh()
    } else {
      alert(res.error)
    }
    setLoadingRev(null)
  }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(n)

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Ledgers</h1>
          <p className="mt-1 text-base text-gray-500 dark:text-gray-400 font-medium">
            {timeFilter === "MONTH" ? "Current Month" : "All Time"} · {summaryStats.txnCount} transactions
          </p>
        </div>
        <Link href="/entry" className="block w-full md:w-auto text-center px-5 py-4 md:py-2.5 bg-[#007AFF] dark:bg-[#0A84FF] text-white text-base font-bold rounded-2xl hover:opacity-90 shadow-sm transition-opacity active:opacity-70">
          + New Entry
        </Link>
      </div>

      {/* View + Time Toggles */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* View Toggle */}
        <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-2xl flex-1 sm:flex-none">
          {([["DATE", "Date-wise"], ["ACCOUNT", "Account-wise"], ["GRAPH", "Graphs"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex-1 sm:flex-none px-4 py-3 sm:py-2 rounded-xl text-sm font-bold transition-all ${
                view === key
                  ? "bg-white dark:bg-[#2C2C2E] shadow-sm text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {/* Time Filter */}
        <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-2xl flex-1 sm:flex-none">
          {([["MONTH", "Monthly"], ["TILL_DATE", "Till Date"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTimeFilter(key)}
              className={`flex-1 sm:flex-none px-4 py-3 sm:py-2 rounded-xl text-sm font-bold transition-all ${
                timeFilter === key
                  ? "bg-white dark:bg-[#2C2C2E] shadow-sm text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[var(--card-bg)] rounded-3xl p-4 border border-black/5 dark:border-white/5 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Transactions</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{summaryStats.txnCount}</p>
        </div>
        <div className="bg-[var(--card-bg)] rounded-3xl p-4 border border-black/5 dark:border-white/5 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Debits</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(summaryStats.totalDebits)}</p>
        </div>
        <div className="bg-[var(--card-bg)] rounded-3xl p-4 border border-black/5 dark:border-white/5 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Credits</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(summaryStats.totalCredits)}</p>
        </div>
      </div>

      {/* ============== DATE-WISE VIEW ============== */}
      {view === "DATE" && (
        <div className="space-y-4">
          {filteredEntries.length === 0 ? (
            <div className="bg-[var(--card-bg)] rounded-3xl p-8 text-center border border-black/5 dark:border-white/5 shadow-sm">
              <p className="text-base font-medium text-gray-500">No transactions found for this period.</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredEntries.map(entry => (
                  <div
                    key={entry.id}
                    className={`bg-[var(--card-bg)] rounded-3xl border border-black/5 dark:border-white/5 shadow-sm overflow-hidden transition-colors ${
                      entry.status === "REVERSED" ? "opacity-60" : ""
                    }`}
                  >
                    <button
                      onClick={() => setExpandedTxn(expandedTxn === entry.id ? null : entry.id)}
                      className="w-full p-4 flex justify-between items-center text-left active:bg-black/5 dark:active:bg-white/5 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-base font-bold text-gray-900 dark:text-white">
                            {new Date(entry.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          </span>
                          {entry.status === "REVERSED" && (
                            <span className="text-[9px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded tracking-widest">REV</span>
                          )}
                        </div>
                        <p className={`text-sm font-medium truncate ${entry.status === "REVERSED" ? "line-through text-gray-400" : "text-gray-600 dark:text-gray-400"}`}>
                          {entry.narration || entry.reference || "—"}
                        </p>
                      </div>
                      <div className="text-right ml-3 shrink min-w-0">
                        <p className="text-base font-bold text-gray-900 dark:text-white font-mono break-all">
                          {formatCurrency(entry.debits)}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 tracking-wide truncate">
                          {entry.reference || "No Ref"}
                        </p>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {expandedTxn === entry.id && (
                      <div className="px-4 pb-4 space-y-3">
                        <div className="bg-gray-50 dark:bg-black/20 rounded-2xl p-3 space-y-2">
                          {entry.lines.map(line => {
                            const isDebit = line.amount >= 0
                            return (
                              <div key={line.id} className="flex justify-between items-center text-sm gap-2">
                                <span className={`flex-1 min-w-0 truncate ${isDebit ? "font-bold text-gray-900 dark:text-white" : "font-medium text-gray-500 pl-3"}`}>
                                  {line.accountName}
                                </span>
                                <span className={`shrink font-mono break-all ${isDebit ? "font-bold text-gray-900 dark:text-white" : "font-medium text-gray-500"}`}>
                                  {isDebit ? formatCurrency(line.amount) : `(${formatCurrency(Math.abs(line.amount))})`}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                        {entry.status === "POSTED" && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleReverse(entry.id)}
                              disabled={loadingRev === entry.id}
                              className="flex-1 py-3 text-amber-600 bg-amber-500/10 rounded-2xl text-sm font-bold disabled:opacity-50 active:opacity-70 transition-opacity"
                            >
                              {loadingRev === entry.id ? "Working..." : "Reverse"}
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              disabled={loadingRev === entry.id}
                              className="flex-1 py-3 text-red-500 bg-red-500/10 rounded-2xl text-sm font-bold disabled:opacity-50 active:opacity-70 transition-opacity"
                            >
                              {loadingRev === entry.id ? "Working..." : "Hard Delete"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block bg-[var(--card-bg)] rounded-3xl border border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-black/5 dark:divide-white/5">
                  <thead className="bg-black/5 dark:bg-white/5">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Ref / Narration</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Accounts</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {filteredEntries.map(entry => (
                      <tr key={entry.id} className={`transition-colors ${entry.status === "REVERSED" ? "bg-red-500/5 opacity-70" : "hover:bg-black/5 dark:hover:bg-white/5"}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white align-top">
                          {new Date(entry.date).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-6 py-4 text-sm align-top max-w-xs">
                          <div className="font-bold text-gray-900 dark:text-white">{entry.reference || "—"}</div>
                          <div className={`text-gray-500 font-medium mt-0.5 ${entry.status === "REVERSED" ? "line-through" : ""}`}>
                            {entry.narration}
                            {entry.status === "REVERSED" && (
                              <span className="ml-2 font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md text-[10px]">REVERSED</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm align-top">
                          <div className="space-y-1.5">
                            {entry.lines.map(line => {
                              const isDebit = line.amount >= 0
                              return (
                                <div key={line.id} className="flex justify-between w-72">
                                  <Link href={`/accounts/${line.accountId}`} className={`hover:underline ${isDebit ? "font-bold text-gray-900 dark:text-white" : "font-medium text-gray-500 pl-4"}`}>
                                    {line.accountName}
                                  </Link>
                                  <span className={`font-mono ${isDebit ? "font-bold text-gray-900 dark:text-white" : "font-medium text-gray-500"}`}>
                                    {isDebit ? formatCurrency(line.amount) : `(${formatCurrency(Math.abs(line.amount))})`}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right align-top">
                          {entry.status === "POSTED" && (
                            <div className="flex flex-col items-end space-y-2">
                              <button
                                onClick={() => handleReverse(entry.id)}
                                disabled={loadingRev === entry.id}
                                className="text-amber-600 hover:text-amber-700 font-bold text-sm disabled:opacity-50 transition-colors"
                              >
                                {loadingRev === entry.id ? "Working..." : "Reverse"}
                              </button>
                              <button
                                onClick={() => handleDelete(entry.id)}
                                disabled={loadingRev === entry.id}
                                className="text-red-500 hover:text-red-600 font-bold text-sm disabled:opacity-50 transition-colors"
                              >
                                {loadingRev === entry.id ? "Working..." : "Hard Delete"}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ============== ACCOUNT-WISE VIEW ============== */}
      {view === "ACCOUNT" && (
        <div className="space-y-5">
          {Object.entries(accountBalances).map(([type, accs]) => (
            <div key={type} className="bg-[var(--card-bg)] rounded-3xl border border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-black/5 dark:bg-white/5 flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">
                  {ACCOUNT_TYPE_LABELS[type] || type}
                </h3>
                <span className="text-sm font-bold text-gray-900 dark:text-white font-mono">
                  {formatCurrency(accs.reduce((sum, a) => sum + a.displayBalance, 0))}
                </span>
              </div>
              <div className="divide-y divide-black/5 dark:divide-white/5">
                {accs.map(acc => (
                  <Link
                    key={acc.account.id}
                    href={`/accounts/${acc.account.id}`}
                    className="flex items-center justify-between px-5 py-4 hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 transition-colors gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold text-gray-900 dark:text-white truncate">{acc.account.name}</p>
                      <p className="text-xs font-medium text-gray-500 mt-0.5 truncate">
                        {acc.account.code || "No Code"} · Dr: {formatCurrency(acc.totalDebit)} · Cr: {formatCurrency(acc.totalCredit)}
                      </p>
                    </div>
                    <div className="text-right ml-3 shrink min-w-0">
                      <p className={`text-lg font-bold font-mono break-all ${acc.displayBalance >= 0 ? "text-gray-900 dark:text-white" : "text-red-500"}`}>
                        {formatCurrency(Math.abs(acc.displayBalance))}
                      </p>
                      <p className="text-[10px] font-bold text-gray-400 tracking-widest truncate">
                        {acc.displayBalance >= 0 ? (acc.account.normalSide === "DEBIT" ? "DR" : "CR") : (acc.account.normalSide === "DEBIT" ? "CR" : "DR")}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============== GRAPH VIEW ============== */}
      {view === "GRAPH" && (
        <div className="space-y-5">
          {/* Income vs Expense Bar Chart */}
          <div className="bg-[var(--card-bg)] rounded-3xl border border-black/5 dark:border-white/5 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest mb-4">
              Income vs Expense
            </h3>
            {dailyData.length === 0 ? (
              <p className="text-center text-sm font-medium text-gray-500 py-8">No data for this period.</p>
            ) : (
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 600, fill: "#9CA3AF" }} />
                    <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: "#9CA3AF" }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ borderRadius: 16, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 13, fontWeight: 600 }}
                      formatter={(value: unknown) => [formatCurrency(Number(value))]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                    <Bar dataKey="income" name="Income" fill="#34C759" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="#FF3B30" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Balance Distribution Pie */}
          <div className="bg-[var(--card-bg)] rounded-3xl border border-black/5 dark:border-white/5 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest mb-4">
              Balance Distribution
            </h3>
            {pieData.length === 0 ? (
              <p className="text-center text-sm font-medium text-gray-500 py-8">No balance data available.</p>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="h-56 w-56 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 16, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 13, fontWeight: 600 }}
                        formatter={(value: unknown) => [formatCurrency(Number(value))]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {pieData.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{item.name}</span>
                      </div>
                      <span className="text-sm font-bold font-mono text-gray-900 dark:text-white">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cash/Bank Balance Trend */}
          {(() => {
            // Build cumulative cash+bank balance over time
            const cashBankIds = new Set(accounts.filter(a => a.type === "CASH" || a.type === "BANK").map(a => a.id))
            const openingCashBank = accounts
              .filter(a => a.type === "CASH" || a.type === "BANK")
              .reduce((sum, a) => sum + a.openingBalance, 0)

            if (cashBankIds.size === 0) return null

            const sortedEntries = [...filteredEntries]
              .filter(e => e.status !== "REVERSED")
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

            let cumulative = openingCashBank
            const trendMap = new Map<string, number>()

            sortedEntries.forEach(entry => {
              const dateStr = new Date(entry.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
              entry.lines.forEach(line => {
                if (cashBankIds.has(line.accountId)) {
                  cumulative += line.amount
                }
              })
              trendMap.set(dateStr, cumulative)
            })

            const trendData = Array.from(trendMap.entries()).map(([date, balance]) => ({ date, balance }))

            if (trendData.length === 0) return null

            return (
              <div className="bg-[var(--card-bg)] rounded-3xl border border-black/5 dark:border-white/5 shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest mb-4">
                  Cash & Bank Balance Trend
                </h3>
                <div className="h-64 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 600, fill: "#9CA3AF" }} />
                      <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: "#9CA3AF" }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={{ borderRadius: 16, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 13, fontWeight: 600 }}
                        formatter={(value: unknown) => [formatCurrency(Number(value)), "Balance"]}
                      />
                      <Line type="monotone" dataKey="balance" stroke="#007AFF" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )
          })()}
        </div>
      )}
      {/* Spacer for mobile bottom nav */}
      <div className="h-24 md:hidden" />
    </div>
  )
}
