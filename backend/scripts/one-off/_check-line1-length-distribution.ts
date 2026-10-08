/**
 * _check-line1-length-distribution.ts
 *
 * Demand Mr. Greffin, 8 oct 2026 — anvan sanitizeCityForProvider() (ki ajoute
 * city a nan line1 lè city gen chif) deplwaye, verifye pa gen yon sèy longè
 * dokimante/konfime pou line1 nan ZiiroPay ki ta ka kraze ak nouvo sifiks la.
 *
 * Rezilta (8 oct 2026): line1 max longè pami KYC APPROVED = 45 karaktè, e
 * valè sa a KONFIME mache AN LIVE (moun ki genyen l gen yon kat ACTIVE/
 * TERMINATED/REPLACED — veridik cardkyc aksepte l). Pa gen okenn ka pre
 * 100 karaktè — MAX_LINE1_LENGTH=100 nan sanitizeCityForProvider() se yon
 * maj pridan, ak koupe entelijan si li janm rive manke plas.
 */
import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const approved = await prisma.kyc.findMany({
      where: { status: 'APPROVED' },
      select: { line1: true, userId: true },
    });
    const lengths = approved.map((k) => (k.line1 || '').trim().length);
    const max = Math.max(...lengths);
    const sorted = [...approved].sort((a, b) => (b.line1 || '').trim().length - (a.line1 || '').trim().length);

    console.log(`Total KYC APPROVED: ${approved.length}`);
    console.log(`line1 max length: ${max}`);
    console.log(`\n── Top 10 pi long line1 (deja apwouve pa founisè a) ──`);
    for (const k of sorted.slice(0, 10)) {
      console.log(`  (${(k.line1 || '').trim().length} car.) "${k.line1}"`);
    }

    const activeCardsWithLongAddr = await prisma.virtualCard.findMany({
      where: { status: { in: ['ACTIVE', 'FROZEN', 'TERMINATED', 'REPLACED'] } },
      select: { userId: true },
    });
    const userIds = new Set(activeCardsWithLongAddr.map((c) => c.userId));
    const successfulWithLine1 = approved.filter((k) => userIds.has(k.userId));
    const successSorted = [...successfulWithLine1].sort((a, b) => (b.line1 || '').trim().length - (a.line1 || '').trim().length);
    console.log(`\n── Pi long line1 PAMI moun ki REYISI kreye yon kat (konfime cardkyc aksepte l) ──`);
    for (const k of successSorted.slice(0, 5)) {
      console.log(`  (${(k.line1 || '').trim().length} car.) "${k.line1}"`);
    }
  } finally {
    await prisma.$disconnect();
  }
}
main();
