/**
 * _audit-kyc-city-contains-digit.ts
 *
 * Demand Mr. Greffin, 8 oct 2026 — apre Rimsky Pierre-Toussaint (trimsky@gmail.com)
 * te rejte pa cardkyc ak "City can contain only letters, hyphens, apostrophes,
 * periods, and spaces" (city="Delmas 71"), konte konbyen lòt kont KYC nan DB a
 * gen menm pwoblèm — chif nan city se yon konvansyon adrès Ayisyen komen
 * (Delmas, Tabarre, Laboule, elatriye tout gen seksyon nimerote).
 *
 * Rezilta (8 oct 2026): 4/120 kont KYC APPROVED gen yon chif nan city. 2 ladan
 * yo deja gen yon kat ACTIVE (reyisi kreye anvan — swa validasyon an pa t
 * toujou aplike, swa yon lòt chemen). 2 lòt (Fabienne, Rimsky) te/ap bloke.
 * Fix: StrowalletService.sanitizeCityForProvider() — retire chif nan city
 * anvan n voye bay founisè a, ajoute l nan line1.
 */
import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const all = await prisma.kyc.findMany({
      select: { userId: true, city: true, status: true },
    });

    const withDigit = all.filter((k) => /\d/.test(k.city || ''));
    const approvedWithDigit = withDigit.filter((k) => k.status === 'APPROVED');

    console.log(`Total kont KYC: ${all.length}`);
    console.log(`Kont ak yon chif nan city: ${withDigit.length}`);
    console.log(`  — nan sa yo, status APPROVED (risk imedya): ${approvedWithDigit.length}`);
    console.log(`  — pa status:`);
    const byStatus: Record<string, number> = {};
    for (const k of withDigit) byStatus[k.status] = (byStatus[k.status] || 0) + 1;
    console.log(JSON.stringify(byStatus, null, 2));

    console.log(`\n── Detay (tout, APPROVED anvan) ──`);
    const sorted = [...withDigit].sort((a, b) => (a.status === 'APPROVED' ? -1 : 1) - (b.status === 'APPROVED' ? -1 : 1));
    for (const k of sorted) {
      const user = await prisma.user.findUnique({ where: { id: k.userId }, select: { email: true, name: true } });
      const card = await prisma.virtualCard.findFirst({ where: { userId: k.userId }, select: { status: true } });
      console.log(`  [${k.status}] ${user?.email} (${user?.name}) — city="${k.city}" — kat existan: ${card ? card.status : 'okenn'}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}
main();
