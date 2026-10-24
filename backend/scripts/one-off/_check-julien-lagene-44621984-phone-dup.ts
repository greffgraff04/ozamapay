import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const PHONE_RAW = '44621984';
const TARGET_EMAIL = 'lagenejuliana8@gmail.com';
const ZIIROPAY_CUSTOMER_ID = '01a10e0e-8242-7d6b-976a-056aa6c876d1';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('=== 1) Users whose User.phone OR Kyc.phoneNumber contains', PHONE_RAW, '===');
    const byPhone = await prisma.user.findMany({
      where: {
        OR: [
          { phone: { contains: PHONE_RAW } },
          { kyc: { phoneNumber: { contains: PHONE_RAW } } },
        ],
      },
      include: { kyc: true },
      orderBy: { createdAt: 'asc' },
    });
    for (const u of byPhone) {
      console.log({
        id: u.id,
        email: u.email,
        name: u.name,
        phone: u.phone,
        kycPhoneNumber: u.kyc?.phoneNumber,
        createdAt: u.createdAt,
        kycStatus: u.kyc?.status,
        strowalletCustomerId: u.strowalletCustomerId,
      });
    }
    console.log(`\nTotal matches: ${byPhone.length}`);

    console.log('\n=== 2) Target user by email', TARGET_EMAIL, '===');
    const target = await prisma.user.findFirst({
      where: { email: { equals: TARGET_EMAIL, mode: 'insensitive' } },
      include: { kyc: true, wallet: true },
    });
    if (target) {
      console.log({
        id: target.id,
        email: target.email,
        name: target.name,
        phone: target.phone,
        kycPhoneNumber: target.kyc?.phoneNumber,
        createdAt: target.createdAt,
        kycStatus: target.kyc?.status,
        strowalletCustomerId: target.strowalletCustomerId,
      });
      const cards = await prisma.virtualCard.findMany({ where: { userId: target.id } });
      console.log('VirtualCards:', JSON.stringify(cards, null, 2));
      const pendings = await prisma.cardCreationPending.findMany({ where: { userId: target.id } });
      console.log('CardCreationPendings:', JSON.stringify(pendings, null, 2));
      const failures = await prisma.cardCreationFailure.findMany({ where: { userId: target.id } });
      console.log('CardCreationFailures:', JSON.stringify(failures, null, 2));
    } else {
      console.log('No user found with that email.');
    }

    console.log('\n=== 3) Any user/record referencing ZiiroPay customer_id', ZIIROPAY_CUSTOMER_ID, '===');
    const byCustomerIdUser = await prisma.user.findMany({
      where: { strowalletCustomerId: ZIIROPAY_CUSTOMER_ID },
      include: { kyc: true },
    });
    console.log('Users.strowalletCustomerId match:', JSON.stringify(byCustomerIdUser, null, 2));

    const byCustomerIdPending = await prisma.cardCreationPending.findMany({
      where: { customerId: ZIIROPAY_CUSTOMER_ID },
    });
    console.log('CardCreationPending match:', JSON.stringify(byCustomerIdPending, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}
main();
