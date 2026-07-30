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
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Chart of Accounts</h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400 font-medium">View and manage your ledger accounts.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()} 
          className="w-full md:w-auto text-center px-5 py-4 md:py-2.5 bg-[#007AFF] dark:bg-[#0A84FF] text-white text-base font-bold rounded-2xl hover:opacity-90 shadow-sm transition-opacity"
        >
          + Add Account
        </button>
      </div>

      <div className="flex justify-end mb-2">
        <label className="flex items-center space-x-2 text-sm font-medium text-gray-600 dark:text-gray-300 cursor-pointer">
          <input 
            type="checkbox" 
            checked={showInactive} 
            onChange={(e) => setShowInactive(e.target.checked)} 
            className="rounded text-[#007AFF] focus:ring-[#007AFF] w-4 h-4"
          />
          <span>Show Inactive Accounts</span>
        </label>
      </div>

      <div className="bg-transparent md:bg-[var(--card-bg)] md:rounded-3xl md:shadow-sm md:border md:border-black/5 md:dark:border-white/5 overflow-hidden">
        
        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {filteredAccounts.map((acc) => (
            <div key={acc.id} className={`bg-[var(--card-bg)] p-5 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 transition-colors ${!acc.isActive ? 'opacity-75 bg-gray-50 dark:bg-black/20' : ''}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                    {acc.code} <span className="text-base font-medium text-gray-500 ml-1">{acc.name}</span>
                  </h3>
                  {!acc.isActive && <span className="inline-block mt-1 text-[10px] text-red-500 font-bold bg-red-500/10 px-2 py-1 rounded-md">INACTIVE</span>}
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Balance</p>
                  <p className={`text-base font-bold ${acc.balance < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                    ₹{acc.balance.toFixed(2)}
                  </p>
                </div>
              </div>
              
              <div className="mb-5 mt-3">
                <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-[#007AFF]/10 text-[#007AFF] dark:bg-[#0A84FF]/20 dark:text-[#0A84FF] uppercase tracking-wider">
                  {acc.type.replace('_', ' ')}
                </span>
              </div>
              
              <div className="flex justify-between items-center border-t border-black/5 dark:border-white/5 pt-4">
                <Link href={`/accounts/${acc.id}`} className="text-[#007AFF] dark:text-[#0A84FF] text-sm font-bold bg-[#007AFF]/10 dark:bg-[#0A84FF]/20 px-4 py-2 rounded-xl active:opacity-70 transition-opacity">
                  View Ledger
                </Link>
                <div className="flex space-x-2">
                  <button onClick={() => handleOpenModal(acc)} className="text-gray-700 dark:text-gray-300 bg-black/5 dark:bg-white/5 px-4 py-2 rounded-xl text-sm font-bold active:opacity-70 transition-opacity">
                    Edit
                  </button>
                  <button onClick={() => handleToggleStatus(acc.id, acc.isActive)} className={`px-4 py-2 rounded-xl text-sm font-bold active:opacity-70 transition-opacity ${acc.isActive ? "text-red-500 bg-red-500/10" : "text-emerald-500 bg-emerald-500/10"}`}>
                    {acc.isActive ? "Del" : "Restore"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-black/5 dark:divide-white/5">
            <thead className="bg-black/5 dark:bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Code</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Balance (₹)</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-[var(--card-bg)] divide-y divide-black/5 dark:divide-white/5">
              {filteredAccounts.map((acc) => (
                <tr key={acc.id} className={`transition-colors ${!acc.isActive ? 'bg-black/5 dark:bg-white/5 opacity-75' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                    {acc.code}
                    {!acc.isActive && <span className="ml-2 text-[10px] text-red-500 font-bold bg-red-500/10 px-2 py-1 rounded-md">INACTIVE</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                    {acc.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-[#007AFF]/10 text-[#007AFF] dark:bg-[#0A84FF]/20 dark:text-[#0A84FF]">
                      {acc.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${acc.balance < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                    {acc.balance.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold space-x-4">
                    <Link href={`/accounts/${acc.id}`} className="text-[#007AFF] hover:text-[#007AFF]/80 dark:text-[#0A84FF] dark:hover:text-[#0A84FF]/80">
                      View
                    </Link>
                    <button onClick={() => handleOpenModal(acc)} className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
                      Edit
                    </button>
                    <button onClick={() => handleToggleStatus(acc.id, acc.isActive)} className={acc.isActive ? "text-red-500 hover:text-red-600" : "text-emerald-500 hover:text-emerald-600"}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="bg-[var(--card-bg)] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-black/5 dark:border-white/10">
            <div className="px-6 py-5 border-b border-black/5 dark:border-white/10 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{editId ? 'Edit Account' : 'New Account'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Code</label>
                <input required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full px-4 py-3 md:py-2.5 text-base border border-black/10 dark:border-white/10 rounded-xl bg-transparent dark:text-white focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-colors" placeholder="e.g. CASH-01" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 md:py-2.5 text-base border border-black/10 dark:border-white/10 rounded-xl bg-transparent dark:text-white focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-colors" placeholder="e.g. Main Cash Drawer" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Type</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-4 py-3 md:py-2.5 text-base border border-black/10 dark:border-white/10 rounded-xl bg-transparent dark:text-white focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-colors">
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
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Normal Side</label>
                  <select value={formData.normalSide} onChange={e => setFormData({...formData, normalSide: e.target.value})} className="w-full px-4 py-3 md:py-2.5 text-base border border-black/10 dark:border-white/10 rounded-xl bg-transparent dark:text-white focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-colors">
                    <option value="DEBIT">Debit</option>
                    <option value="CREDIT">Credit</option>
                  </select>
                </div>
              </div>
              <div className="pt-5 flex flex-col md:flex-row justify-end space-y-3 md:space-y-0 md:space-x-3 mt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="w-full md:w-auto px-6 py-4 md:py-2.5 text-base font-bold text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors border border-black/10 dark:border-white/10 md:border-transparent active:opacity-70">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="w-full md:w-auto px-6 py-4 md:py-2.5 bg-[#007AFF] dark:bg-[#0A84FF] text-white text-base font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 active:opacity-70">
                  {loading ? 'Saving...' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Spacer for mobile bottom nav */}
      <div className="h-24 md:hidden" />
    </div>
  )
}
