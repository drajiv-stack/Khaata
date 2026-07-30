import { PrismaClient } from "@prisma/client"
import Link from "next/link"
import { notFound } from "next/navigation"
import AccountLedgerInteractive from "@/components/AccountLedgerInteractive"

const prisma = new PrismaClient()
export const dynamic = "force-dynamic"

export default async function AccountLedgerPage(props: { params: Promise<{ id: string }>, searchParams: Promise<{ from?: string }> }) {
  const { id } = await props.params
  const searchParams = await props.searchParams
  const from = searchParams.from || 'accounts'
  
  const rawAccount = await prisma.account.findUnique({
    where: { id }
  })

  if (!rawAccount) {
    notFound()
  }

  // Convert Decimal to number for Client Component serialization
  const account = {
    ...rawAccount,
    openingBalance: Number(rawAccount.openingBalance),
    varianceAmberThreshold: rawAccount.varianceAmberThreshold ? Number(rawAccount.varianceAmberThreshold) : null,
    varianceRedThreshold: rawAccount.varianceRedThreshold ? Number(rawAccount.varianceRedThreshold) : null,
  }

  // Fetch all transaction lines for this account
  const lines = await prisma.transactionLine.findMany({
    where: { 
      accountId: id,
      transaction: { status: { in: ['POSTED', 'REVERSED'] } } 
    },
    include: { 
      transaction: {
        select: { txnDate: true, reference: true, narration: true, status: true, id: true }
      } 
    },
    orderBy: [
      { transaction: { txnDate: 'asc' } },
      { transactionId: 'asc' } // stable sort
    ]
  })

  // Calculate running balance
  let runningBalance = 0
  const ledgerEntries = lines.map(line => {
    const amt = Number(line.amount)
    runningBalance += amt
    
    // For display, we separate into Debit and Credit columns based on positive/negative amount
    const isDebit = amt >= 0
    const absAmount = Math.abs(amt)
    
    // Display running balance according to normal side
    const displayBalance = account.normalSide === 'CREDIT' ? -runningBalance : runningBalance
    
    return {
      id: line.id,
      transactionId: line.transaction.id,
      date: line.transaction.txnDate,
      reference: line.transaction.reference,
      narration: line.transaction.narration,
      status: line.transaction.status,
      debit: isDebit ? absAmount : null,
      credit: !isDebit ? absAmount : null,
      balance: displayBalance
    }
  })

  // Overall current display balance
  const currentBalance = account.normalSide === 'CREDIT' ? -runningBalance : runningBalance

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-2">
        <Link href={`/${from}`} className="text-sm font-bold text-[#007AFF] hover:opacity-80 transition-opacity bg-[#007AFF]/10 px-4 py-2 rounded-xl inline-flex items-center">
          ← Back to {from === 'accounts' ? 'COA' : 'Ledgers'}
        </Link>
      </div>

      <AccountLedgerInteractive 
        account={account} 
        initialEntries={ledgerEntries} 
        currentBalance={currentBalance}
        from={from}
      />
    </div>
  )
}
