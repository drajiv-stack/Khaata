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

export default function TransactionForm({ accounts: initialAccounts }: { accounts: Account[] }) {
  const router = useRouter()
  
  const [localAccounts, setLocalAccounts] = useState<Account[]>(initialAccounts)

  // Header state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [reference, setReference] = useState("")
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
      setError("You must provide at least two lines for a double-entry transaction.")
      return
    }
    
    if (!narration) {
      setError("Narration is required.")
      return
    }

    setLoading(true)
    const formattedLines = lines.map(l => ({
      accountId: l.accountId,
      amount: l.type === 'DEBIT' ? l.amount : -l.amount
    }))

    const res = await createTransaction({
      date,
      reference,
      narration,
      lines: formattedLines
    })

    if (res.success) {
      router.push("/dashboard")
    } else {
      setError(res.error || "An unknown error occurred")
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
    <div className="space-y-6 relative">
      {/* Account Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create New Account</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateAccount} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account Code</label>
                <input type="text" required placeholder="e.g. CUST-001"
                       value={newAccForm.code} onChange={e => setNewAccForm({...newAccForm, code: e.target.value})}
                       className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account Name</label>
                <input type="text" required placeholder="e.g. Acme Corp"
                       value={newAccForm.name} onChange={e => setNewAccForm({...newAccForm, name: e.target.value})}
                       className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                <select required value={newAccForm.type} onChange={e => setNewAccForm({...newAccForm, type: e.target.value})}
                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-700 dark:text-white">
                  <option value="ASSET">Asset</option>
                  <option value="LIABILITY">Liability</option>
                  <option value="OWNER_EQUITY">Owner Equity</option>
                  <option value="REVENUE">Revenue</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Normal Side</label>
                <select required value={newAccForm.normalSide} onChange={e => setNewAccForm({...newAccForm, normalSide: e.target.value})}
                        className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-700 dark:text-white">
                  <option value="DEBIT">Debit</option>
                  <option value="CREDIT">Credit</option>
                </select>
              </div>
              {newAccError && <p className="text-red-500 text-sm font-medium">{newAccError}</p>}
              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={newAccLoading} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 transition-colors">
                  {newAccLoading ? "Saving..." : "Save Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Transaction Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
            <input type="date" required value={date} onChange={e => setDate(e.target.value)}
                   className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2 border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reference No.</label>
            <input type="text" value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. INV-2023-001"
                   className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2 border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Narration</label>
            <input type="text" required value={narration} onChange={e => setNarration(e.target.value)} placeholder="Brief description..."
                   className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2 border" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Add Line</h2>
        <form onSubmit={handleAddLine} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="col-span-1 md:col-span-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account</label>
            <select 
              required 
              value={currentAccount} 
              onChange={handleAccountSelect}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2 border"
            >
              <option value="" disabled>Select an account...</option>
              <option value="ADD_NEW" className="font-bold text-blue-600 dark:text-blue-400 border-b border-gray-200 dark:border-gray-700">
                + Add New Account...
              </option>
              {localAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.code ? `${acc.code} - ` : ''}{acc.name}</option>
              ))}
            </select>
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
            <select 
              value={currentType} 
              onChange={e => setCurrentType(e.target.value as 'DEBIT'|'CREDIT')}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2 border font-medium"
            >
              <option value="DEBIT">Debit</option>
              <option value="CREDIT">Credit</option>
            </select>
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount (₹)</label>
            <input type="number" step="0.01" min="0.01" required placeholder="0.00"
                   value={currentAmount} onChange={e => setCurrentAmount(e.target.value)}
                   className="mt-1 block w-full text-right rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2 border" />
          </div>
          <div className="col-span-1 md:col-span-2">
            <button type="submit" className="w-full py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-100 dark:bg-blue-900 focus:outline-none transition-colors">
              + Add
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Ledger</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No entries added yet. Use the form above to add lines.
                  </td>
                </tr>
              ) : lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                    {line.accountName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                    {line.type === 'DEBIT' ? line.amount.toFixed(2) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                    {line.type === 'CREDIT' ? line.amount.toFixed(2) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                    <button onClick={() => removeLine(line.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white text-right uppercase">Total</td>
                <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white text-right">
                  ₹{totalDebit.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white text-right">
                  ₹{totalCredit.toFixed(2)}
                </td>
                <td className="px-6 py-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50 dark:bg-gray-900/50">
          <div className="text-sm">
            {!isBalanced && lines.length > 0 && (
              <span className="text-red-600 font-medium">
                Difference: ₹{Math.abs(totalDebit - totalCredit).toFixed(2)} — Transaction is unbalanced
              </span>
            )}
            {isBalanced && lines.length > 0 && (
              <span className="text-green-600 font-medium">
                Transaction is balanced
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {error && <span className="text-sm text-red-600 font-medium">{error}</span>}
            <button
              onClick={handleSubmit}
              disabled={loading || !isBalanced || lines.length < 2 || !narration}
              className="inline-flex justify-center py-2 px-8 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Posting..." : "Post Transaction"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
