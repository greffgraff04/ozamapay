import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const NEW_PHONE_DIGITS = '49088716';
const NEW_PHONE_FULL = '50949088716';

async function main() {
  const prisma = new PrismaClient();
  try {
    const matches = await prisma.user.findMany({
      where: {
        OR: [
          { phone: { contains: NEW_PHONE_DIGITS } },
          { kyc: { phoneNumber: { contains: NEW_PHONE_DIGITS } } },
        ],
      },
      include: { kyc: true },
    });
    console.log(`Matches for ${NEW_PHONE_DIGITS} / ${NEW_PHONE_FULL}:`, matches.length);
    for (const u of matches) {
      console.log({ id: u.id, email: u.email, phone: u.phone, kycPhone: u.kyc?.phoneNumber });
    }
  } finally {
    await prisma.$disconnect();
  }
}
main();
