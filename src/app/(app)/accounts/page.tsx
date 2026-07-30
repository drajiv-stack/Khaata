import { PrismaClient } from "@prisma/client"
import ChartOfAccountsInteractive from "@/components/ChartOfAccountsInteractive"

const prisma = new PrismaClient()
export const dynamic = "force-dynamic"

export default async function AccountsPage() {
  // We use the same high-performance aggregation query as the dashboard
  const accountsRaw = await prisma.$queryRaw`
    SELECT a.id, a.code, a.name, a.type, a.normal_side as "normalSide", a.is_active as "isActive",
           COALESCE(SUM(tl.amount), 0) as balance
    FROM accounts a
    LEFT JOIN transaction_lines tl ON a.id = tl.account_id
    LEFT JOIN transactions t ON tl.transaction_id = t.id AND t.status = 'POSTED'
    GROUP BY a.id, a.code, a.name, a.type, a.normal_side, a.is_active
    ORDER BY a.type, a.code
  `
  
  const accounts = (accountsRaw as any[]).map(acc => ({
    ...acc,
    balance: Number(acc.balance)
  }))

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <ChartOfAccountsInteractive initialAccounts={accounts} />
    </div>
  )
}
