import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const balancesRaw = await prisma.$queryRaw`
    SELECT a.id, a.code, a.name, a.type, a.normal_side as "normalSide",
           COALESCE(SUM(tl.amount), 0) as balance
    FROM accounts a
    LEFT JOIN transaction_lines tl ON a.id = tl.account_id
    LEFT JOIN transactions t ON tl.transaction_id = t.id AND t.status = 'POSTED'
    GROUP BY a.id, a.code, a.name, a.type, a.normal_side
  `;
  console.dir(balancesRaw, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
