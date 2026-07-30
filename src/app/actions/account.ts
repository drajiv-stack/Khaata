"use server"

import { PrismaClient } from "@prisma/client"
import { auth } from "@/auth"

const prisma = new PrismaClient()

export async function createAccount(data: {
  code: string
  name: string
  type: string
  normalSide: string
}) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")
  
  try {
    const account = await prisma.account.create({
      data: {
        code: data.code.toUpperCase().trim(),
        name: data.name.trim(),
        type: data.type,
        normalSide: data.normalSide,
        isActive: true
      },
      select: { id: true, code: true, name: true, type: true }
    })
    
    return { success: true, account }
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: "An account with this code already exists." }
    }
    return { success: false, error: error.message || "Failed to create account" }
  }
}
