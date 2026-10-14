import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const USER_ID = 'eed85032-ff79-4dc5-b11c-83af56164c1e';

async function main() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { id: USER_ID }, include: { wallet: true, kyc: true } });
    console.log('Kyc.phoneNumber:', user?.kyc?.phoneNumber);
    console.log('Wallet balance:', user?.wallet?.balance);
    const cards = await prisma.virtualCard.findMany({ where: { userId: USER_ID } });
    console.log('VirtualCards (should be none):', cards.length);
    const lastTxn = await prisma.transaction.findFirst({
      where: { senderWalletId: user?.wallet?.id },
      orderBy: { createdAt: 'desc' },
    });
    console.log('Latest Transaction:', JSON.stringify(lastTxn, null, 2));
    const lastFailure = await prisma.cardCreationFailure.findFirst({
      where: { userId: USER_ID },
      orderBy: { createdAt: 'desc' },
    });
    console.log('Latest CardCreationFailure:', JSON.stringify(lastFailure, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}
main();
