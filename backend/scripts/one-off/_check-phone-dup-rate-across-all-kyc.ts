import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const kycs = await prisma.kyc.findMany({ select: { phoneNumber: true, userId: true } });
    const byPhone: Record<string, string[]> = {};
    for (const k of kycs) {
      const norm = (k.phoneNumber || '').replace(/\D/g, '');
      if (!norm) continue;
      byPhone[norm] = byPhone[norm] || [];
      byPhone[norm].push(k.userId);
    }
    const dups = Object.entries(byPhone).filter(([, ids]) => ids.length > 1);
    console.log(`Total distinct KYC phone numbers: ${Object.keys(byPhone).length}`);
    console.log(`Phone numbers shared by 2+ accounts: ${dups.length}`);
    for (const [phone, ids] of dups.slice(0, 20)) {
      console.log(phone, ids);
    }
  } finally {
    await prisma.$disconnect();
  }
}
main();
