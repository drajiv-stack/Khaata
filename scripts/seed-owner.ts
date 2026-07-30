import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const email = "owner@example.com"
  const password = "password123"
  
  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    console.log("Owner user already exists!")
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)

  await prisma.user.create({
    data: {
      email,
      fullName: "Pump Owner",
      passwordHash,
      role: "OWNER",
    }
  })

  console.log("Seeded default owner account:")
  console.log("Email: owner@example.com")
  console.log("Password: password123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
