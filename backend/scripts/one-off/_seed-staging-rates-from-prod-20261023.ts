import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

// Valè kopye an LEKTI SÈLMAN depi prod (ozamapay-backend) le 2026-10-23 —
// PA yon nouvo desizyon biznis, se vrè to aktyèl yo. Script sa a sèlman
// pou ranpli base STAGING (ozamapay_staging) ki pa gen okenn seed Rate,
// pou pèmèt yon tès konvèsyon bout-an-bout. Gad-fou: refize si l detekte
// l ap tounen sou baz done "prod".
const SEED = {
  USD_HTG: 135,
  EUR_HTG: 152,
};

async function main() {
  const prisma = new PrismaClient();
  try {
    const [{ current_database }] = await prisma.$queryRaw<{ current_database: string }[]>`
      SELECT current_database();
    `;
    if (!/staging/i.test(current_database)) {
      throw new Error(
        `REFIZE: baz done sa a ("${current_database}") pa sanble staging — script sa a sèlman pou staging.`,
      );
    }

    for (const [key, value] of Object.entries(SEED)) {
      const row = await prisma.rate.upsert({
        where: { key },
        update: { value },
        create: { key, value, currency: 'HTG' },
      });
      console.log(`${key} -> ${row.value}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
