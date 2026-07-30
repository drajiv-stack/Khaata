import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const defaultAccounts = [
    { code: 'CASH-01', name: 'Cash in hand (counter)', type: 'CASH', normalSide: 'DEBIT' },
    { code: 'CASH-02', name: 'Cash in safe', type: 'CASH', normalSide: 'DEBIT' },
    { code: 'BANK-01', name: 'Bank — current account', type: 'BANK', normalSide: 'DEBIT' },
    { code: 'DIG-UPI', name: 'UPI collections (awaiting settlement)', type: 'DIGITAL_SETTLEMENT', normalSide: 'DEBIT' },
    { code: 'DIG-CARD', name: 'Card collections (awaiting settlement)', type: 'DIGITAL_SETTLEMENT', normalSide: 'DEBIT' },
    { code: 'SUP-OMC', name: 'Oil company account', type: 'SUPPLIER', normalSide: 'CREDIT' },
    { code: 'INC-FUEL', name: 'Fuel sales', type: 'INCOME', normalSide: 'CREDIT' },
    { code: 'INC-OTHER', name: 'Other sales (lubricants, shop)', type: 'INCOME', normalSide: 'CREDIT' },
    { code: 'EXP-PURCH', name: 'Fuel purchases', type: 'EXPENSE', normalSide: 'DEBIT' },
    { code: 'EXP-SAL', name: 'Staff salaries', type: 'EXPENSE', normalSide: 'DEBIT' },
    { code: 'EXP-ELEC', name: 'Electricity', type: 'EXPENSE', normalSide: 'DEBIT' },
    { code: 'EXP-MAINT', name: 'Maintenance and repairs', type: 'EXPENSE', normalSide: 'DEBIT' },
    { code: 'EXP-CHRG', name: 'Bank and payment charges', type: 'EXPENSE', normalSide: 'DEBIT' },
    { code: 'EXP-MISC', name: 'Miscellaneous expenses', type: 'EXPENSE', normalSide: 'DEBIT' },
    { code: 'EQ-OWNER', name: "Owner's capital / drawings", type: 'OWNER_EQUITY', normalSide: 'CREDIT' },
    // Examples of additional custom-named accounts that can be added
    // { code: 'EXP-INTERNET', name: 'Internet & Comm', type: 'EXPENSE', normalSide: 'DEBIT' },
  ]

  // Use a default opening date of today if not specified
  const openingDate = new Date()

  console.log('Seeding default chart of accounts...')

  for (const acc of defaultAccounts) {
    const existing = await prisma.account.findUnique({
      where: { code: acc.code }
    })
    
    if (!existing) {
      await prisma.account.create({
        data: {
          ...acc,
          openingDate,
        }
      })
      console.log(`Created account: ${acc.code} - ${acc.name}`)
    } else {
      console.log(`Account ${acc.code} already exists.`)
    }
  }

  console.log('Seeding complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
