import { PrismaClient } from "@prisma/client"
import UnifiedLedgersInteractive from "@/components/UnifiedLedgersInteractive"

const prisma = new PrismaClient()
export const dynamic = "force-dynamic"

export default async function LedgerPage() {
  // Fetch all posted/reversed transactions with lines
  const transactions = await prisma.transaction.findMany({
    where: { status: { in: ['POSTED', 'REVERSED'] } },
    include: { 
      lines: {
        include: { account: true }
      }
    },
    orderBy: [
      { txnDate: 'desc' },
      { id: 'desc' }
    ]
  })

  // Fetch all active accounts for account-wise view
  const rawAccounts = await prisma.account.findMany({
    where: { isActive: true },
    orderBy: [{ type: 'asc' }, { name: 'asc' }]
  })

  const generalEntries = transactions.map(txn => {
    let debits = 0
    let credits = 0
    
    txn.lines.forEach(line => {
      const amt = Number(line.amount)
      if (amt >= 0) debits += amt
      else credits += Math.abs(amt)
    })

    return {
      id: txn.id,
      date: txn.txnDate,
      reference: txn.reference,
      narration: txn.narration,
      status: txn.status,
      debits,
      credits,
      lines: txn.lines.map(l => ({
        id: l.id,
        accountId: l.accountId,
        accountName: l.account.name,
        accountType: l.account.type,
        amount: Number(l.amount)
      })).sort((a, b) => b.amount - a.amount) // Debits first
    }
  })

  const accounts = rawAccounts.map(a => ({
    id: a.id,
    code: a.code,
    name: a.name,
    type: a.type,
    normalSide: a.normalSide,
    openingBalance: Number(a.openingBalance),
  }))

  return (
    <div className="max-w-7xl mx-auto">
      <UnifiedLedgersInteractive initialEntries={generalEntries} accounts={accounts} />
    </div>
  )
}
