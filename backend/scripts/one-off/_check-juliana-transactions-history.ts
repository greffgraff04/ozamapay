import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const USER_ID = 'eed85032-ff79-4dc5-b11c-83af56164c1e';

async function main() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { id: USER_ID }, include: { wallet: true } });
    console.log('Wallet:', JSON.stringify(user?.wallet, null, 2));
    const txns = await prisma.transaction.findMany({
      where: { senderWalletId: user?.wallet?.id },
      orderBy: { createdAt: 'asc' },
    });
    console.log('Transactions:', JSON.stringify(txns, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}
main();
