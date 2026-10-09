/**
 * _audit-giftcard-completed-orders-exposure.ts
 *
 * Demand Mr. Greffin, 8 oct 2026 — apre ka kirstenetienne@gmail.com (GiftCardOrder
 * 63def7f5-0a9d-49e0-8cd1-a57d74f884dc, COMPLETED, redeemCode prezan depi 31 out,
 * men kliyan pa t janm wè l). Rasin pwobab: UI a ("w ap resevwa kòd la pa imel")
 * pwomèt yon imèl ki PA JANM egziste nan mail.service.ts/giftcards.service.ts —
 * kliyan ki te gen kòd pa pare imedyatman nan moman acha a (PROCESSING→COMPLETED
 * apre, pa janm konnen pou l al tcheke tab "Kado & Kredi".
 *
 * Script sa a lekti sèlman — konte konbyen lòt kliyan gen menm ekspozisyon
 * (yon GiftCardOrder COMPLETED ak redeemCode prezan), pou kalibre anpleur
 * pwoblèm nan anvan nenpòt korije (voye imèl reyèl, oswa retire fo pwomès la).
 */
import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const completed = await prisma.giftCardOrder.findMany({
      where: { status: 'COMPLETED', redeemCode: { not: null } },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`Total GiftCardOrder COMPLETED ak redeemCode prezan: ${completed.length}\n`);

    for (const o of completed) {
      const user = await prisma.user.findUnique({ where: { id: o.userId }, select: { email: true, name: true } });
      console.log(
        `  ${o.createdAt.toISOString().slice(0, 10)}  ${user?.email} (${user?.name}) — ` +
        `${o.productName} $${o.unitPrice} (${o.htgPaid} HTG) — redeemCode len=${o.redeemCode?.length ?? 0}`,
      );
    }

    const byUser = new Map<string, number>();
    for (const o of completed) byUser.set(o.userId, (byUser.get(o.userId) ?? 0) + 1);
    const multiOrder = [...byUser.entries()].filter(([, count]) => count > 1);
    console.log(`\nKliyan ak plizyè kòmand COMPLETED (mwens risk — yo gen tan dwe konnen kòman sa mache): ${multiOrder.length}`);
    console.log(`Kliyan ak SÈLMAN YON kòmand COMPLETED (pi gwo risk — se ka Kirsten lan): ${byUser.size - multiOrder.length}`);
  } finally {
    await prisma.$disconnect();
  }
}
main();
