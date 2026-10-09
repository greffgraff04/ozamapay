/**
 * notify-giftcard-ready-completed-no-email.ts
 *
 * Demand Mr. Greffin, 8 oct 2026 — apre ka kirstenetienne@gmail.com: li te
 * achte yon gift card 31 out 2026, kòd la fin pare (GiftCardOrder.status=
 * COMPLETED, redeemCode prezan) men li pa t janm resevwa okenn konfimasyon,
 * paske UI a pwomèt yon imèl ("w ap resevwa kòd la pa imel") ki PA JANM
 * egziste pou gift card (verifye: pa gen okenn apèl MailService pou gift
 * card anvan sendGiftCardReadyNotice() jodi a). Odit DB (8 oct 2026) jwenn
 * 7 GiftCardOrder COMPLETED ak redeemCode total — script sa a enfòme TOUT
 * 7 kliyan yo kòd yo pare, SAN janm mete redeemCode la nan imèl la (rezon
 * sekirite — imèl ka entèsepte).
 *
 * Safety: DRY-RUN pa default — montre 7 kliyan yo, pwodwi, ak dat, AUKENN
 * imèl voye. Kouri ak --confirm pou voye pou tout bon.
 *
 * Kòmand (nan /backend):
 *   npx ts-node --transpile-only scripts/one-off/notify-giftcard-ready-completed-no-email.ts            # dry-run
 *   npx ts-node --transpile-only scripts/one-off/notify-giftcard-ready-completed-no-email.ts --confirm  # live
 */

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MailModule } from '../../src/mail/mail.module';
import { MailService } from '../../src/mail/mail.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaModule } from '../../src/prisma/prisma.module';

@Module({ imports: [PrismaModule, MailModule] })
class NotifyGiftCardReadyModule {}

async function main() {
  const confirm = process.argv.includes('--confirm');

  const app = await NestFactory.createApplicationContext(NotifyGiftCardReadyModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);
  const mailService = app.get(MailService);

  try {
    const orders = await prisma.giftCardOrder.findMany({
      where: { status: 'COMPLETED', redeemCode: { not: null } },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    console.log(`── ${orders.length} GiftCardOrder COMPLETED ak redeemCode prezan ──`);
    for (const o of orders) {
      const dateFmt = o.createdAt.toLocaleDateString('fr-HT');
      console.log(`  ${o.user?.name ?? 'Kliyan'} <${o.user?.email}> — ${o.productName} ($${o.unitPrice}) — ${dateFmt}`);
    }
    console.log('──────────────────────────────────────────────────────────');

    if (!confirm) {
      console.log('\n[DRY-RUN] Pa gen okenn imèl ki voye. Kouri ak --confirm pou egzekite pou tout bon.');
      return;
    }

    console.log('\n[LIVE] Ap voye imèl...');
    let sent = 0;
    let failed = 0;
    for (const o of orders) {
      if (!o.user?.email) { failed++; console.error(`  ✗ Pa gen email pou GiftCardOrder ${o.id}`); continue; }
      try {
        const dateFmt = o.createdAt.toLocaleDateString('fr-HT');
        await mailService.sendGiftCardReadyNotice(o.user.email, o.user.name ?? 'Kliyan', o.productName, dateFmt);
        sent++;
      } catch (err: any) {
        failed++;
        console.error(`  ✗ Echwe pou ${o.user.email}: ${err?.message ?? err}`);
      }
    }
    console.log(`\n[LIVE] Fini: ${sent} imèl voye, ${failed} echwe (sou ${orders.length}).`);
  } finally {
    await app.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
