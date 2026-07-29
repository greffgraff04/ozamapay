/**
 * manual-recreate-card-felix.ts
 *
 * Script one-off, egzekite yon sèl fwa pou ka Felix Stevenson (29 jiyè 2026),
 * AVAN CardTerminationService te egziste. PA reyize pou lòt kliyan san
 * apwobasyon biznis.
 *
 * ONE-OFF script. Manually recreates a StroWallet virtual card for a customer
 * whose card was terminated BEFORE CardTerminationService existed — no fee
 * deduction, no wallet check, no PENDING_RECHARGE logic. $3 initial balance,
 * flat, per explicit instruction.
 *
 * Reuses the real StrowalletService.createReplacementCard() (live StroWallet
 * API call) and MailService.sendCardReplaced() — same code paths as the
 * automated flow, just triggered manually for this single customer.
 *
 * Safety: runs in DRY-RUN mode by default (prints what it would do, makes
 * NO external API call, NO DB write, NO email). Only runs for real with
 * --confirm.
 *
 * Kòmand (nan /backend):
 *   npx ts-node --transpile-only scripts/one-off/manual-recreate-card-felix.ts            # dry-run
 *   npx ts-node --transpile-only scripts/one-off/manual-recreate-card-felix.ts --confirm  # live
 */

import { NestFactory } from '@nestjs/core';
import { StrowalletModule } from '../../src/strowallet/strowallet.module';
import { StrowalletService } from '../../src/strowallet/strowallet.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { MailService } from '../../src/mail/mail.service';

const CUSTOMER_EMAIL = 'felixstevenson2025@gmail.com';
const INITIAL_BALANCE_USD = 3;
const MANUAL_NOTE = 'Kreyasyon manyèl — ka eksepsyonèl anvan CardTerminationService';

async function main() {
  const confirm = process.argv.includes('--confirm');

  const app = await NestFactory.createApplicationContext(StrowalletModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);
  const strowalletService = app.get(StrowalletService);
  const mailService = app.get(MailService);

  try {
    const user = await prisma.user.findUnique({
      where: { email: CUSTOMER_EMAIL },
      include: { wallet: true, kyc: true, virtualCards: true },
    });

    if (!user) {
      console.error(`Pa jwenn itilizatè ak email ${CUSTOMER_EMAIL}`);
      return;
    }

    const oldCard = user.virtualCards.find((c) => !['TERMINATED', 'REPLACED'].includes(c.status));

    console.log('── Kliyan ───────────────────────────────────────────');
    console.log(`  userId: ${user.id}`);
    console.log(`  non:    ${user.name}`);
    console.log(`  email:  ${user.email}`);
    console.log(`  KYC:    ${user.kyc?.status ?? 'AUKENN'}`);
    console.log('── Ansyen kat ────────────────────────────────────────');
    if (oldCard) {
      console.log(`  cardId: ${oldCard.cardId} | status: ${oldCard.status} | balance: $${oldCard.balance}`);
      console.log(`  → ap mete status=TERMINATED, terminatedAt=now, replacedByCardId=<nouvo kat>`);
    } else {
      console.log('  Pa gen kat ak status ACTIVE/FROZEN/PENDING_RECHARGE pou lyen — pa gen mizajou sou ansyen kat.');
    }
    console.log('── Nouvo kat ─────────────────────────────────────────');
    console.log(`  Balans inisyal: $${INITIAL_BALANCE_USD} (san dediksyon frè, san verifikasyon wallet)`);
    console.log(`  Nòt tras:       "${MANUAL_NOTE}"`);
    console.log(`  Imel:           sendCardReplaced(${user.email}, "${user.name}", ${INITIAL_BALANCE_USD})`);
    console.log('────────────────────────────────────────────────────────');

    if (!confirm) {
      console.log('\n[DRY-RUN] Pa gen okenn apèl API StroWallet, ekri BDD, oswa imèl ki voye. Kouri ak --confirm pou egzekite pou tout bon.');
      return;
    }

    console.log('\n[LIVE] Kreye kat la kounye a via StroWallet...');
    const newCard = await strowalletService.createReplacementCard(user.id, INITIAL_BALANCE_USD);
    console.log(`  ✓ Nouvo kat kreye: id=${newCard.id} cardId=${newCard.cardId}`);

    if (oldCard) {
      await prisma.virtualCard.update({
        where: { cardId: oldCard.cardId },
        data: { status: 'TERMINATED', terminatedAt: new Date(), replacedByCardId: newCard.id },
      });
      console.log(`  ✓ Ansyen kat ${oldCard.cardId} mete TERMINATED, lyen bay ${newCard.id}`);
    }

    await prisma.transaction.create({
      data: {
        senderWalletId: user.wallet?.id,
        type: 'CARD',
        amount: 0,
        netAmount: 0,
        fee: 0,
        status: 'COMPLETED',
        description: MANUAL_NOTE,
        reference: `CARD-MANUAL-${newCard.cardId}`,
      },
    });
    console.log('  ✓ Antre Transaction (tras) kreye');

    await mailService.sendCardReplaced(user.email, user.name ?? 'Kliyan', INITIAL_BALANCE_USD);
    console.log('  ✓ Imel voye');

    console.log('\n[LIVE] Fini.');
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
