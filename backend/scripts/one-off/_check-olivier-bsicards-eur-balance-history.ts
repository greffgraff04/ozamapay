/**
 * _check-olivier-bsicards-eur-balance-history.ts
 * Lekti sèlman — envestige poukisa VirtualCard.balance pou kat BSICards EUR
 * Olivier a (6a962a96...) pa 0, pou konprann si backfill €3.00 la ka aplike.
 */
import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const CARD_ID = '6a962a96ed36d19c602cbe04';

async function main() {
  const prisma = new PrismaClient();
  try {
    const card = await prisma.virtualCard.findUnique({ where: { cardId: CARD_ID } });
    console.log('VirtualCard:', JSON.stringify(card, null, 2));

    const txs = await prisma.transaction.findMany({
      where: { reference: { contains: CARD_ID } },
      orderBy: { createdAt: 'asc' },
    });
    console.log('\nTransactions matching cardId in reference:');
    for (const t of txs) {
      console.log(`  ${t.createdAt.toISOString()} | ${t.reference} | ${t.status} | amount=${t.amount} | ${t.description}`);
    }

    const cardTxs = await prisma.cardTransaction.findMany({ where: { cardId: CARD_ID }, orderBy: { occurredAt: 'asc' } });
    console.log('\nCardTransaction rows for this cardId:');
    for (const t of cardTxs) {
      console.log(`  ${t.occurredAt.toISOString()} | ${t.type} | ${t.status} | amount=${t.amount} ${t.currency}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
