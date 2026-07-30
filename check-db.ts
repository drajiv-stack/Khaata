import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const txs = await prisma.transaction.findMany({
    include: {
      lines: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 5
  });
  console.dir(txs, { depth: null });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
