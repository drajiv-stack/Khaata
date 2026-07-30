"use client"

import { useState } from "react"
import { createTransaction } from "@/app/actions/transaction"
import { createAccount } from "@/app/actions/account"
import { useRouter } from "next/navigation"

type Account = {
  id: string
  code: string | null
  name: string
  type: string
}

type LineItem = {
  id: number
  accountId: string
  accountName: string
  type: 'DEBIT' | 'CREDIT'
  amount: number
}

function generateRef() {
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `TXN-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

export default function TransactionForm({ accounts: initialAccounts }: { accounts: Account[] }) {
  const router = useRouter()
  
  const [localAccounts, setLocalAccounts] = useState<Account[]>(initialAccounts)

  // Header state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [narration, setNarration] = useState("")
  
  // Current Line state
  const [currentAccount, setCurrentAccount] = useState("")
  const [currentType, setCurrentType] = useState<'DEBIT' | 'CREDIT'>("DEBIT")
  const [currentAmount, setCurrentAmount] = useState("")
  
  // Ledger Lines state
  const [lines, setLines] = useState<LineItem[]>([])
  
  // Submission state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [newAccLoading, setNewAccLoading] = useState(false)
  const [newAccError, setNewAccError] = useState<string | null>(null)
  const [newAccForm, setNewAccForm] = useState({
    code: "", name: "", type: "ASSET", normalSide: "DEBIT"
  })

  const handleAddLine = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentAccount || !currentAmount || parseFloat(currentAmount) <= 0) return

    const account = localAccounts.find(a => a.id === currentAccount)
    if (!account) return

    const newLine: LineItem = {
      id: Date.now(),
      accountId: account.id,
      accountName: account.code ? `${account.code} - ${account.name}` : account.name,
      type: currentType,
      amount: parseFloat(currentAmount)
    }

    setLines([...lines, newLine])
    
    // Reset inputs, optionally switch type to help balance it
    setCurrentAccount("")
    setCurrentAmount("")
    setCurrentType(currentType === 'DEBIT' ? 'CREDIT' : 'DEBIT')
    
    // Suggest the remaining balance as the amount
    const newTotalDebit = lines.reduce((sum, l) => sum + (l.type === 'DEBIT' ? l.amount : 0), 0) + (newLine.type === 'DEBIT' ? newLine.amount : 0)
    const newTotalCredit = lines.reduce((sum, l) => sum + (l.type === 'CREDIT' ? l.amount : 0), 0) + (newLine.type === 'CREDIT' ? newLine.amount : 0)
    const diff = Math.abs(newTotalDebit - newTotalCredit)
    if (diff > 0) {
      setCurrentAmount(diff.toString())
      setCurrentType(newTotalDebit > newTotalCredit ? 'CREDIT' : 'DEBIT')
    }
  }

  const removeLine = (id: number) => {
    setLines(lines.filter(l => l.id !== id))
  }

  const totalDebit = lines.reduce((sum, l) => sum + (l.type === 'DEBIT' ? l.amount : 0), 0)
  const totalCredit = lines.reduce((sum, l) => sum + (l.type === 'CREDIT' ? l.amount : 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001

  const handleSubmit = async () => {
    setError(null)

    if (!isBalanced) {
      setError("Cannot submit: Total Debits must equal Total Credits.")
      return
    }

    if (lines.length < 2) {
      setError("You must provide at least two entries for a double-entry transaction.")
      return
    }

    setLoading(true)
    try {
      const formattedLines = lines.map(l => ({
        accountId: l.accountId,
        amount: l.type === 'DEBIT' ? l.amount : -l.amount
      }))

      const res = await createTransaction({
        date,
        reference: generateRef(),
        narration: narration || "",
        lines: formattedLines
      })

      if (res.success) {
        router.push("/dashboard")
      } else {
        setError(res.error || "An unknown error occurred")
        setLoading(false)
      }
    } catch (err: any) {
      console.error("Submit error:", err)
      setError(err?.message || "An unexpected error occurred")
      setLoading(false)
    }
  }

  const handleAccountSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === "ADD_NEW") {
      setShowModal(true)
      setCurrentAccount("")
    } else {
      setCurrentAccount(e.target.value)
    }
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setNewAccError(null)
    setNewAccLoading(true)

    const res = await createAccount(newAccForm)
    
    if (res.success && res.account) {
      setLocalAccounts(prev => [...prev, res.account as Account].sort((a,b) => (a.code || "").localeCompare(b.code || "")))
      setCurrentAccount(res.account.id)
      setShowModal(false)
      setNewAccForm({ code: "", name: "", type: "ASSET", normalSide: "DEBIT" })
    } else {
      setNewAccError(res.error || "Failed to create account")
    }
    setNewAccLoading(false)
  }

  return (
    <div className="space-y-3 relative max-w-5xl mx-auto">
      {/* Account Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md px-4">
          <div className="bg-[var(--card-bg)] rounded-3xl shadow-2xl w-full max-w-md border border-black/5 dark:border-white/10">
            <div className="p-6 border-b border-black/5 dark:border-white/10 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Create New Account</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateAccount} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Account Code</label>
                <input type="text" required placeholder="e.g. CUST-001"
                       value={newAccForm.code} onChange={e => setNewAccForm({...newAccForm, code: e.target.value})}
                       className="block w-full rounded-xl border border-black/10 dark:border-white/10 px-4 py-3 text-base dark:bg-[#1C1C1E] dark:text-white bg-white focus:ring-2 focus:ring-[#007AFF] focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Account Name</label>
                <input type="text" required placeholder="e.g. Acme Corp"
                       value={newAccForm.name} onChange={e => setNewAccForm({...newAccForm, name: e.target.value})}
                       className="block w-full rounded-xl border border-black/10 dark:border-white/10 px-4 py-3 text-base dark:bg-[#1C1C1E] dark:text-white bg-white focus:ring-2 focus:ring-[#007AFF] focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Type</label>
                <select required value={newAccForm.type} onChange={e => setNewAccForm({...newAccForm, type: e.target.value})}
                        className="block w-full rounded-xl border border-black/10 dark:border-white/10 px-4 py-3 text-base dark:bg-[#1C1C1E] dark:text-white bg-white focus:ring-2 focus:ring-[#007AFF] focus:border-transparent outline-none">
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank</option>
                  <option value="DIGITAL_SETTLEMENT">Digital Settlement</option>
                  <option value="SUPPLIER">Supplier</option>
                  <option value="CUSTOMER">Customer</option>
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                  <option value="OWNER_EQUITY">Owner Equity</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Normal Side</label>
                <select required value={newAccForm.normalSide} onChange={e => setNewAccForm({...newAccForm, normalSide: e.target.value})}
                        className="block w-full rounded-xl border border-black/10 dark:border-white/10 px-4 py-3 text-base dark:bg-[#1C1C1E] dark:text-white bg-white focus:ring-2 focus:ring-[#007AFF] focus:border-transparent outline-none">
                  <option value="DEBIT">Debit</option>
                  <option value="CREDIT">Credit</option>
                </select>
              </div>
              {newAccError && <p className="text-red-500 text-sm font-bold">{newAccError}</p>}
              <div className="pt-2 flex space-x-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-black/10 dark:border-white/10 rounded-2xl text-gray-700 dark:text-gray-300 font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={newAccLoading} className="flex-1 py-3 bg-[#007AFF] dark:bg-[#0A84FF] text-white rounded-2xl font-bold disabled:opacity-50 hover:opacity-90 transition-opacity">
                  {newAccLoading ? "Saving..." : "Save Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Header: Date and Notes */}
      <div className="bg-[var(--card-bg)] rounded-3xl shadow-sm border border-black/5 dark:border-white/5 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="md:w-48 shrink-0">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Date</label>
            <input type="date" required value={date} onChange={e => setDate(e.target.value)}
                   className="block w-full rounded-xl border border-black/10 dark:border-white/10 px-4 py-2.5 text-base font-bold dark:bg-[#1C1C1E] dark:text-white bg-white focus:ring-2 focus:ring-[#007AFF] focus:border-transparent outline-none" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Title / Notes (Optional)</label>
            <input
              type="text"
              value={narration}
              onChange={e => setNarration(e.target.value)}
              placeholder="e.g. Cash sale to customer"
              className="block w-full rounded-xl border border-black/10 dark:border-white/10 px-4 py-2.5 text-base dark:bg-[#1C1C1E] dark:text-white bg-white focus:ring-2 focus:ring-[#007AFF] focus:border-transparent outline-none"
            />
          </div>
        </div>
      </div>

      {/* Add Entries */}
      <div className="bg-[var(--card-bg)] rounded-3xl shadow-sm border border-black/5 dark:border-white/5 p-4">
        <h2 className="text-lg font-bold mb-3 text-gray-900 dark:text-white tracking-tight">Add Entries</h2>
        <form onSubmit={handleAddLine} className="space-y-3">
          {/* Account Select */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Account</label>
            <select 
              required 
              value={currentAccount} 
              onChange={handleAccountSelect}
              className="block w-full rounded-xl border border-black/10 dark:border-white/10 px-4 py-3 text-base dark:bg-[#1C1C1E] dark:text-white bg-white focus:ring-2 focus:ring-[#007AFF] focus:border-transparent outline-none"
            >
              <option value="" disabled>Select an account...</option>
              <option value="ADD_NEW" className="font-bold">
                + Add New Account...
              </option>
              {localAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.code ? `${acc.code} - ` : ''}{acc.name}</option>
              ))}
            </select>
          </div>

          {/* Debit/Credit Toggle + Amount */}
          <div className="space-y-3">
            {/* Toggle */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Type</label>
              <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCurrentType("DEBIT")}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    currentType === "DEBIT"
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  Debit
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentType("CREDIT")}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    currentType === "CREDIT"
                      ? "bg-[#007AFF] dark:bg-[#0A84FF] text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  Credit
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Amount (₹)</label>
              <input type="number" step="0.01" min="0.01" required placeholder="0.00"
                     value={currentAmount} onChange={e => setCurrentAmount(e.target.value)}
                     className="block w-full text-right rounded-xl border border-black/10 dark:border-white/10 px-4 py-2.5 text-base font-bold dark:bg-[#1C1C1E] dark:text-white bg-white focus:ring-2 focus:ring-[#007AFF] focus:border-transparent outline-none font-mono" />
            </div>
          </div>

          <button type="submit" className="w-full py-3.5 shadow-sm text-base font-bold rounded-2xl text-white bg-[#007AFF] dark:bg-[#0A84FF] hover:opacity-90 transition-opacity active:opacity-70">
            + Add Entry
          </button>
        </form>
      </div>

      {/* Ledger Preview */}
      <div className="bg-[var(--card-bg)] rounded-3xl shadow-sm border border-black/5 dark:border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 dark:border-white/5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Ledger Preview</h2>
        </div>
        
        {/* Mobile Card View */}
        <div className="md:hidden p-4 space-y-2">
          {lines.length === 0 ? (
            <div className="text-center text-sm font-medium text-gray-400 py-6">No entries added yet.</div>
          ) : (
            lines.map(line => (
              <div key={line.id} className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl flex justify-between items-center">
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-base font-bold text-gray-900 dark:text-white truncate">{line.accountName}</p>
                  <span className={`text-xs font-bold mt-1 inline-block px-2 py-0.5 rounded-md ${
                    line.type === 'DEBIT' ? 'text-emerald-500 bg-emerald-500/10' : 'text-[#007AFF] bg-[#007AFF]/10'
                  }`}>
                    {line.type}
                  </span>
                </div>
                <div className="text-right flex items-center gap-3">
                  <p className="text-base font-bold text-gray-900 dark:text-white font-mono">₹{line.amount.toFixed(2)}</p>
                  <button onClick={() => removeLine(line.id)} className="text-red-500 bg-red-500/10 p-2 rounded-xl text-xs font-bold active:opacity-70">
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Totals */}
          {lines.length > 0 && (
            <div className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-bold">Total Debit</span>
                <span className="font-bold text-gray-900 dark:text-white font-mono">₹{totalDebit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-bold">Total Credit</span>
                <span className="font-bold text-gray-900 dark:text-white font-mono">₹{totalCredit.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <table className="hidden md:table min-w-full divide-y divide-black/5 dark:divide-white/5">
          <thead className="bg-black/5 dark:bg-white/5">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Account</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Debit</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Credit</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5">
            {lines.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm font-medium text-gray-400">
                  No entries added yet. Use the form above to add entries.
                </td>
              </tr>
            ) : lines.map((line) => (
              <tr key={line.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                  {line.accountName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white font-mono">
                  {line.type === 'DEBIT' ? `₹${line.amount.toFixed(2)}` : '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white font-mono">
                  {line.type === 'CREDIT' ? `₹${line.amount.toFixed(2)}` : '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button onClick={() => removeLine(line.id)} className="text-red-500 hover:text-red-600 font-bold text-sm transition-colors">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {lines.length > 0 && (
            <tfoot className="bg-black/5 dark:bg-white/5">
              <tr>
                <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white text-right uppercase tracking-widest">Total</td>
                <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white text-right font-mono">₹{totalDebit.toFixed(2)}</td>
                <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white text-right font-mono">₹{totalCredit.toFixed(2)}</td>
                <td className="px-6 py-4"></td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* Submit Footer */}
        <div className="p-5 border-t border-black/5 dark:border-white/5 space-y-4 bg-gray-50/50 dark:bg-black/20">
          {/* Status */}
          <div className="text-sm">
            {lines.length < 2 && (
              <span className="text-gray-400 font-medium">{lines.length === 0 ? "Add at least 2 entries to get started." : "Add one more entry to complete."}</span>
            )}
            {!isBalanced && lines.length > 1 && (
              <span className="text-red-500 font-bold">⚠ Difference: ₹{Math.abs(totalDebit - totalCredit).toFixed(2)} — Unbalanced</span>
            )}
            {isBalanced && lines.length > 1 && (
              <span className="text-emerald-500 font-bold">✓ Balanced and ready to post</span>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
              <p className="text-red-500 font-bold text-sm">{error}</p>
            </div>
          )}

          {/* Post Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !isBalanced || lines.length < 2}
            className="w-full py-4 shadow-sm text-base font-bold rounded-2xl text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            {loading ? "Posting..." : "Post Transaction"}
          </button>
        </div>
      </div>

      {/* Spacer for mobile bottom nav */}
      <div className="h-24 md:hidden" />
    </div>
  )
}
