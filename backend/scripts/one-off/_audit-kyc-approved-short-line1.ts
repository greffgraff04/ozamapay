/**
 * _audit-kyc-approved-short-line1.ts
 *
 * Demand Mr. Greffin, 4 oct 2026 — apre kandida "Dave Angelo Pierre" te rejte
 * pa cardkyc ak "address1 is too short" (line1="PAUP", 4 karaktè), konte
 * konbyen lòt kont KYC APPROVED nan DB a ka gen menm pwoblèm anvan nenpòt
 * lansman piblik.
 *
 * Kalibraj sèy la (pa gen dokiman ofisyèl sou egzak limit StroWallet la):
 *   - REJTE KONFIME: "PAUP" (4 karaktè) → rejte.
 *   - APWOUVE KONFIME: "Lamandou" (8), "17,rue gros morne" (17),
 *     "#51 Rue Christophe " (19) → tout apwouve.
 *   Sèy reyèl la rete ant 5-7 karaktè — enkoni egzakteman. Rapò sa a bay 2
 *   bokèt: "< 5" (zòn ki KONFIME pwoblematik) ak "< 8" (zòn RA, enkli sèy
 *   enkoni a pou pa rate okenn ka — pi laj sou rezon pridans).
 */
import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const approved = await prisma.kyc.findMany({
      where: { status: 'APPROVED' },
      select: { userId: true, line1: true },
    });

    const empty = approved.filter((k) => !k.line1 || k.line1.trim().length === 0);
    const under5 = approved.filter((k) => k.line1 && k.line1.trim().length > 0 && k.line1.trim().length < 5);
    const under8 = approved.filter((k) => k.line1 && k.line1.trim().length > 0 && k.line1.trim().length >= 5 && k.line1.trim().length < 8);

    console.log(`Total kont KYC APPROVED: ${approved.length}`);
    console.log(`\n① line1 VID/NULL (rejè garanti): ${empty.length}`);
    console.log(`② line1 < 5 karaktè (zòn KONFIME pwoblematik, tankou "PAUP"): ${under5.length}`);
    console.log(`③ line1 ant 5-7 karaktè (zòn RA — sèy egzak enkoni, PASIBLMAN pwoblematik): ${under8.length}`);
    console.log(`\nTOTAL A RISK (① + ② + ③): ${empty.length + under5.length + under8.length} / ${approved.length}`);

    const detail = async (list: typeof approved, label: string) => {
      if (!list.length) return;
      console.log(`\n── Detay ${label} ──`);
      for (const k of list) {
        const user = await prisma.user.findUnique({ where: { id: k.userId }, select: { email: true, name: true } });
        console.log(`  ${user?.email} (${user?.name}) — line1="${k.line1 ?? ''}" (${(k.line1 ?? '').trim().length} car.)`);
      }
    };
    await detail(empty, '① VID/NULL');
    await detail(under5, '② < 5 karaktè');
    await detail(under8, '③ 5-7 karaktè');
  } finally {
    await prisma.$disconnect();
  }
}
main();
