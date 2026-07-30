import { PrismaClient } from "@prisma/client"
import Link from "next/link"
import { notFound } from "next/navigation"
import AccountLedgerInteractive from "@/components/AccountLedgerInteractive"

const prisma = new PrismaClient()
export const dynamic = "force-dynamic"

export default async function AccountLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const account = await prisma.account.findUnique({
    where: { id }
  })

  if (!account) {
    notFound()
  }

  // Fetch all transaction lines for this account
  const lines = await prisma.transactionLine.findMany({
    where: { 
      accountId: id,
      transaction: { status: { in: ['POSTED', 'REVERSED'] } } 
    },
    include: { 
      transaction: {
        select: { date: true, reference: true, narration: true, status: true, id: true }
      } 
    },
    orderBy: [
      { transaction: { date: 'asc' } },
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
      date: line.transaction.date,
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
        <Link href="/accounts" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          ← Back to Accounts
        </Link>
      </div>

      <AccountLedgerInteractive 
        account={account} 
        initialEntries={ledgerEntries} 
        currentBalance={currentBalance} 
      />
    </div>
  )
}
