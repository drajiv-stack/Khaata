"use server"

import { PrismaClient } from "@prisma/client"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

const prisma = new PrismaClient()

export type TransactionLineInput = {
  accountId: string
  amount: number // Positive = Debit, Negative = Credit
}

export async function createTransaction(data: {
  date: string
  reference: string
  narration: string
  lines: TransactionLineInput[]
}) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  // Validate balance
  const sum = data.lines.reduce((acc, line) => acc + line.amount, 0)
  // Dealing with floating point precision
  if (Math.abs(sum) > 0.001) {
    throw new Error("Transaction is not balanced (Debits != Credits)")
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const txn = await tx.transaction.create({
        data: {
          date: new Date(data.date),
          reference: data.reference,
          narration: data.narration,
          status: "POSTED",
          source: "MANUAL",
          createdById: session.user.id,
          lines: {
            create: data.lines.map(line => ({
              accountId: line.accountId,
              amount: line.amount,
            }))
          }
        }
      })
      
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE",
          entityType: "TRANSACTION",
          entityId: txn.id,
          afterJson: { reference: txn.reference, narration: txn.narration }
        }
      })
      
      return txn
    })

    revalidatePath("/dashboard")
    revalidatePath("/accounts")
    return { success: true, transactionId: result.id }
  } catch (error: any) {
    console.error("Transaction Error:", error)
    return { success: false, error: error.message || "Failed to save transaction" }
  }
}
