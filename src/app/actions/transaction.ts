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
  if (!session?.user) return { success: false, error: "Unauthorized" }

  // Validate balance
  const sum = data.lines.reduce((acc, line) => acc + line.amount, 0)
  // Dealing with floating point precision
  if (Math.abs(sum) > 0.001) {
    return { success: false, error: "Transaction is not balanced (Debits != Credits)" }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const txn = await tx.transaction.create({
        data: {
          txnDate: new Date(data.date),
          template: "MANUAL",
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

export async function reverseTransaction(transactionId: string, reason: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: "Unauthorized" }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Find the original transaction
      const original = await tx.transaction.findUnique({
        where: { id: transactionId },
        include: { lines: true }
      })
      if (!original) throw new Error("Transaction not found")
      if (original.status !== "POSTED") throw new Error("Only POSTED transactions can be reversed")
      if (original.reversesTransactionId || original.reversedByTransactionId) {
         throw new Error("This transaction is already part of a reversal")
      }

      // Create reversing transaction
      const reversal = await tx.transaction.create({
        data: {
          txnDate: new Date(), // Reversal date is today
          template: "REVERSAL",
          reference: `REV-${original.reference || original.id.substring(0,6)}`,
          narration: `REVERSAL: ${reason}`,
          status: "POSTED",
          source: "ADJUSTMENT",
          createdById: session.user.id,
          reversesTransactionId: original.id,
          lines: {
            create: original.lines.map(line => ({
              accountId: line.accountId,
              amount: -Number(line.amount) // Invert the amount
            }))
          }
        }
      })
      
      // Mark original as reversed
      await tx.transaction.update({
        where: { id: original.id },
        data: { 
          status: "REVERSED", 
          reversedByTransactionId: reversal.id 
        }
      })

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "REVERSE",
          entityType: "TRANSACTION",
          entityId: original.id,
          afterJson: { reason, reversalId: reversal.id }
        }
      })

      return reversal
    })

    revalidatePath("/dashboard")
    revalidatePath("/accounts")
    revalidatePath("/ledger")
    return { success: true, transactionId: result.id }
  } catch (error: any) {
    console.error("Reversal Error:", error)
    return { success: false, error: error.message || "Failed to reverse transaction" }
  }
}

export async function deleteTransaction(transactionId: string) {
  try {
    const session = await auth()
    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }

    // Run in a transaction to ensure both lines and the parent are deleted together
    await prisma.$transaction(async (tx) => {
      // 1. Delete all child transaction lines
      await tx.transactionLine.deleteMany({
        where: { transactionId }
      })

      // 2. Delete the parent transaction
      await tx.transaction.delete({
        where: { id: transactionId }
      })

      // 3. Log the hard deletion
      await tx.auditLog.create({
        data: {
          action: "DELETE",
          entityType: "Transaction",
          entityId: transactionId,
          userId: session.user.id,
          beforeJson: { note: "Transaction permanently deleted" }
        }
      })
    })
    
    revalidatePath("/ledger")
    revalidatePath("/audit")
    revalidatePath("/dashboard")
    
    return { success: true }
  } catch (error: any) {
    console.error("Delete Transaction Error:", error)
    return { success: false, error: error.message || "Failed to delete transaction" }
  }
}
