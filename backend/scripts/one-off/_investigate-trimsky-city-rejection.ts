import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const EMAIL = 'trimsky@gmail.com';

async function main() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({
      where: { email: EMAIL },
      include: {
        wallet: true,
        kyc: true,
        virtualCards: true,
      },
    });
    console.log('=== USER ===');
    console.log(JSON.stringify(user, null, 2));

    if (!user) return;

    const failures = await prisma.cardCreationFailure.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    console.log('\n=== CARD CREATION FAILURES ===');
    console.log(JSON.stringify(failures, null, 2));

    const pending = await prisma.cardCreationPending.findMany({
      where: { userId: user.id },
    });
    console.log('\n=== PENDING CARD CREATIONS ===');
    console.log(JSON.stringify(pending, null, 2));

    const failTxns = await prisma.transaction.findMany({
      where: { senderWalletId: user.wallet?.id, type: 'CARD' },
      orderBy: { createdAt: 'desc' },
    });
    console.log('\n=== CARD TRANSACTIONS ===');
    console.log(JSON.stringify(failTxns, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}
main();
