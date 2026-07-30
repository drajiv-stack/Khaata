"use client"

import { useState } from "react"
import { createAccount, editAccount, toggleAccountStatus } from "@/app/actions/account"
import Link from "next/link"
import { useRouter } from "next/navigation"

type AccountData = {
  id: string
  code: string | null
  name: string
  type: string
  normalSide: string
  isActive: boolean
  balance: number
}

export default function ChartOfAccountsInteractive({ initialAccounts }: { initialAccounts: AccountData[] }) {
  const router = useRouter()
  const [showInactive, setShowInactive] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Form state
  const [editId, setEditId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "CASH",
    normalSide: "DEBIT"
  })

  const filteredAccounts = initialAccounts.filter(acc => showInactive ? true : acc.isActive)

  const handleOpenModal = (acc?: AccountData) => {
    if (acc) {
      setEditId(acc.id)
      setFormData({
        code: acc.code || "",
        name: acc.name,
        type: acc.type,
        normalSide: acc.normalSide
      })
    } else {
      setEditId(null)
      setFormData({
        code: "",
        name: "",
        type: "CASH",
        normalSide: "DEBIT"
      })
    }
    setModalOpen(true)
  }

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    if (!currentStatus) {
      // Activating
      await toggleAccountStatus(id, true)
    } else {
      // Deactivating
      if (!confirm("Are you sure you want to remove (deactivate) this account? It will no longer be available for new transactions.")) return
      await toggleAccountStatus(id, false)
    }
    router.refresh()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    let res;
    if (editId) {
      res = await editAccount(editId, formData)
    } else {
      res = await createAccount(formData)
    }
    
    if (res.success) {
      setModalOpen(false)
      router.refresh()
    } else {
      alert(res.error)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Chart of Accounts</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">View and manage your ledger accounts and their current balances.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()} 
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 shadow-sm transition-colors"
        >
          + Add Account
        </button>
      </div>

      <div className="flex justify-end">
        <label className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
          <input 
            type="checkbox" 
            checked={showInactive} 
            onChange={(e) => setShowInactive(e.target.checked)} 
            className="rounded text-blue-600 focus:ring-blue-500"
          />
          <span>Show Inactive Accounts</span>
        </label>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance (₹)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAccounts.map((acc) => (
                <tr key={acc.id} className={`transition-colors ${!acc.isActive ? 'bg-gray-50 dark:bg-gray-900/30 opacity-75' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {acc.code}
                    {!acc.isActive && <span className="ml-2 text-xs text-red-500 font-normal">(Inactive)</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {acc.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {acc.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${acc.balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                    {acc.balance.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <Link href={`/accounts/${acc.id}`} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                      View
                    </Link>
                    <button onClick={() => handleOpenModal(acc)} className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
                      Edit
                    </button>
                    <button onClick={() => handleToggleStatus(acc.id, acc.isActive)} className={acc.isActive ? "text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" : "text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"}>
                      {acc.isActive ? "Deactivate" : "Restore"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editId ? 'Edit Account' : 'New Account'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-500">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code</label>
                <input required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="e.g. CASH-01" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="e.g. Main Cash Drawer" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank</option>
                    <option value="DIGITAL_SETTLEMENT">Digital/Card</option>
                    <option value="CUSTOMER">Customer (Debtor)</option>
                    <option value="SUPPLIER">Supplier (Creditor)</option>
                    <option value="INCOME">Income</option>
                    <option value="EXPENSE">Expense</option>
                    <option value="OWNER_EQUITY">Equity</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Normal Side</label>
                  <select value={formData.normalSide} onChange={e => setFormData({...formData, normalSide: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="DEBIT">Debit</option>
                    <option value="CREDIT">Credit</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {loading ? 'Saving...' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
