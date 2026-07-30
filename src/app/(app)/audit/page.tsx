import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
export const dynamic = "force-dynamic"

export default async function AuditLogPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { occurredAt: 'desc' },
    include: {
      user: { select: { email: true, role: true } }
    },
    take: 100 // Limit to recent 100 for now
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Audit Log</h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 font-medium">A secure, immutable record of all actions performed in the system.</p>
      </div>

      <div className="bg-transparent md:bg-[var(--card-bg)] md:rounded-3xl md:shadow-sm md:border md:border-black/5 md:dark:border-white/5 overflow-hidden">
        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {logs.length === 0 ? (
            <div className="text-center text-sm font-medium text-gray-500 py-6">No audit logs recorded yet.</div>
          ) : logs.map((log) => (
            <div key={log.id} className="bg-[var(--card-bg)] p-5 rounded-3xl shadow-sm border border-black/5 dark:border-white/5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                    log.action === 'CREATE' ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400' :
                    log.action === 'UPDATE' ? 'bg-amber-500/10 text-amber-500 dark:text-amber-400' :
                    log.action === 'DELETE' ? 'bg-red-500/10 text-red-500 dark:text-red-400' :
                    'bg-gray-500/10 text-gray-500 dark:text-gray-400'
                  }`}>
                    {log.action}
                  </span>
                  <p className="text-base font-bold text-gray-900 dark:text-white mt-2">{log.entityType}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{log.occurredAt.toLocaleDateString()}</p>
                  <p className="text-xs font-medium text-gray-500">{log.occurredAt.toLocaleTimeString()}</p>
                </div>
              </div>
              
              <div className="mb-4 flex items-center space-x-3 bg-black/5 dark:bg-white/5 p-3 rounded-2xl">
                <div className="h-8 w-8 rounded-full bg-[#007AFF]/10 dark:bg-[#0A84FF]/20 flex items-center justify-center text-[#007AFF] dark:text-[#0A84FF] text-sm font-bold">
                  {log.user?.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{log.user?.email}</p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{log.user?.role}</p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-black/20 rounded-2xl p-4">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-2">Details</p>
                <pre className="text-xs font-mono font-medium text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-32">
                  {JSON.stringify(log.afterJson, null, 2)}
                </pre>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-black/5 dark:divide-white/5">
            <thead className="bg-black/5 dark:bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Action</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Entity</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Details</th>
              </tr>
            </thead>
            <tbody className="bg-[var(--card-bg)] divide-y divide-black/5 dark:divide-white/5">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm font-medium text-gray-500">
                    No audit logs recorded yet.
                  </td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 dark:text-gray-400 align-top">
                    <div className="font-bold text-gray-900 dark:text-white">{log.occurredAt.toLocaleDateString()}</div>
                    <div className="text-xs mt-0.5">{log.occurredAt.toLocaleTimeString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm align-top">
                    <div className="font-bold text-gray-900 dark:text-white">{log.user?.email}</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">{log.user?.role}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap align-top">
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                      log.action === 'CREATE' ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400' :
                      log.action === 'UPDATE' ? 'bg-amber-500/10 text-amber-500 dark:text-amber-400' :
                      log.action === 'DELETE' ? 'bg-red-500/10 text-red-500 dark:text-red-400' :
                      'bg-gray-500/10 text-gray-500 dark:text-gray-400'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white align-top">
                    {log.entityType} 
                    <div className="text-[10px] font-medium text-gray-500 mt-1 truncate max-w-[120px]" title={log.entityId || ""}>{log.entityId}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 align-top">
                    <pre className="text-xs font-mono font-medium bg-gray-50 dark:bg-black/20 p-3 rounded-xl border border-black/5 dark:border-white/5 overflow-x-auto max-h-32">
                      {JSON.stringify(log.afterJson, null, 2)}
                    </pre>
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
