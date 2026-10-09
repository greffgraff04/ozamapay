import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const EMAIL = 'kirstenetienne@gmail.com';

async function main() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({
      where: { email: EMAIL },
      include: { wallet: true },
    });
    console.log('=== USER ===');
    console.log(JSON.stringify(user, null, 2));
    if (!user) return;

    const orders = await prisma.giftCardOrder.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    console.log('\n=== TOUT GIFT CARD ORDERS ===');
    console.log(JSON.stringify(orders, null, 2));

    const txns = await prisma.transaction.findMany({
      where: {
        OR: [
          { senderWalletId: user.wallet?.id },
          { receiverWalletId: user.wallet?.id },
        ],
        description: { contains: 'gift', mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
    });
    console.log('\n=== TRANSACTION (deskripsyon contni "gift") ===');
    console.log(JSON.stringify(txns, null, 2));

    const ledger = await prisma.ledgerEntry.findMany({
      where: { walletId: user.wallet?.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    console.log('\n=== LEDGER ENTRIES (50 pi resan) ===');
    console.log(JSON.stringify(ledger, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}
main();
