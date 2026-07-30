import { PrismaClient } from "@prisma/client"
import GeneralLedgerInteractive from "@/components/GeneralLedgerInteractive"

const prisma = new PrismaClient()
export const dynamic = "force-dynamic"

export default async function GeneralLedgerPage() {
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

  const generalEntries = transactions.map(txn => {
    let debits = 0;
    let credits = 0;
    
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
        accountName: l.account.name,
        accountType: l.account.type,
        amount: Number(l.amount)
      })).sort((a, b) => b.amount - a.amount) // Debits first
    }
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <GeneralLedgerInteractive initialEntries={generalEntries} />
    </div>
  )
}
