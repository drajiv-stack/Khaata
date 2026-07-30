import { PrismaClient } from "@prisma/client"
import TransactionForm from "@/components/TransactionForm"

const prisma = new PrismaClient()
export const dynamic = "force-dynamic"

export default async function EntryPage() {
  const accounts = await prisma.account.findMany({
    select: { id: true, code: true, name: true, type: true },
    orderBy: { code: 'asc' }
  })

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">New Entry</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Record a new manual journal entry.</p>
      </div>

      <TransactionForm accounts={accounts} />
    </div>
  )
}
