/**
 * withdraw-excess-kiara-dolly.ts
 *
 * Script one-off, egzekite yon sèl fwa (9 out 2026) pou kliyan
 * kiaradolly@gmail.com (Jeanwentz dolly / "Kiara Dolly"). PA reyize pou lòt
 * kliyan san apwobasyon biznis, dat, ak rezon klè.
 *
 * KONTEKS: Olivier te kredite wallet Kiara a 2 fwa manyèlman (+37,006 ak
 * +8,372 HTG, 9 out) pou sèten li te gen ase HTG pou kouvri plizyè tantativ
 * rechaj kat vityèl li (kat te fenk kreye, StroWallet te gen yon pann
 * `fund-withdraw-nfccard` ki te lakòz plizyè echèk ranbouse otomatikman
 * anvan StroWallet konfime yo fikse pwoblèm nan). Apre yon seri tès rechaj
 * REYÈL ki mennen kat la nan $262 total (objektif final la), yon gwo
 * eksedan HTG rete sou wallet li a — pa bezwen ankò pou objektif kat la.
 *
 * ENVESTIGASYON SEPARE (menm sesyon) te konfime yon "diskrepans" 3,107.97
 * HTG ki te sanble parèt nan balans wallet la — men sa a te AN REALITE yon
 * eksplikasyon konplè ak pa gen rapò ak eksè sa a: 2 topup istorik (28 jiyè
 * ak 27 jiyè, anvan tout istwa kat la) montre yon montan BRIT nan
 * `Transaction.amount` pandan `Wallet.balance` reflete montan NÈT (apre
 * frè 6%/8.9%) — yon karakteristik SISTEMIK nan `approveTopup()` ak webhook
 * MonCash, PA yon bug pou wallet sa a espesifikman. `Wallet.balance` aktyèl
 * la konfime kòrèk e konplètman rekonsilye.
 *
 * Script la soustè 6,189.03 HTG (balans aktyèl 6,289.03 - 100 kite sou
 * kont li) — SAN touche okenn ansyen Transaction — kreye yon NOUVO antre
 * ki make kle kòm retrè administratif pou tras.
 *
 * Safety: DRY-RUN pa default. Verifye (1) wallet la egal EGZAKTEMAN
 * 6,289.03 HTG anvan soustraksyon (garanti pa gen lòt tranzaksyon ki rive
 * antretan), (2) pa gen deja yon Transaction retrè administratif pou menm
 * rezon an (anpeche doub-egzekisyon), (3) balans apre soustraksyon an egal
 * egzakteman 100 HTG (pa negatif, pa yon lòt valè). Kouri ak --confirm pou
 * egzekite pou tout bon.
 *
 * Kòmand (nan /backend):
 *   npx ts-node --transpile-only scripts/one-off/withdraw-excess-kiara-dolly.ts            # dry-run
 *   npx ts-node --transpile-only scripts/one-off/withdraw-excess-kiara-dolly.ts --confirm  # live
 */

import { NestFactory } from '@nestjs/core';
import { StrowalletModule } from '../../src/strowallet/strowallet.module';
import { PrismaService } from '../../src/prisma/prisma.service';

const CUSTOMER_EMAIL = 'kiaradolly@gmail.com';
const EXPECTED_BALANCE_HTG = 6289.03;
const TARGET_REMAINING_HTG = 100;
const WITHDRAW_AMOUNT_HTG = 6189.03;
const NARRATIVE = 'Retrè administratif — retire sipli lajan ki te ajoute pou kouvri frè rechaj kat';

async function main() {
  const confirm = process.argv.includes('--confirm');

  const app = await NestFactory.createApplicationContext(StrowalletModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);

  try {
    // ── 1. Jwenn kliyan an ────────────────────────────────────────────────
    const user = await prisma.user.findFirst({
      where: { email: CUSTOMER_EMAIL },
      include: { wallet: true },
    });
    if (!user) {
      console.error(`✗ Pa jwenn itilizatè ak email ${CUSTOMER_EMAIL}`);
      return;
    }
    if (!user.wallet) {
      console.error(`✗ Itilizatè ${CUSTOMER_EMAIL} pa gen wallet — ARÈTE`);
      return;
    }

    console.log('── Kliyan ────────────────────────────────────────────────');
    console.log(`  userId:  ${user.id}`);
    console.log(`  non:     ${user.name}`);
    console.log(`  email:   ${user.email}`);
    console.log(`  wallet:  ${user.wallet.id} | balans aktyèl: ${user.wallet.balance} HTG`);

    // ── 2. Anpeche doub-retrè ─────────────────────────────────────────────
    const existingWithdraw = await prisma.transaction.findFirst({
      where: { AND: [{ description: { contains: 'Retrè administratif' } }, { description: { contains: 'frè rechaj kat' } }] },
    });
    if (existingWithdraw) {
      console.error(`✗ Gen deja yon Transaction retrè administratif (${existingWithdraw.reference}) pou menm rezon an — ARÈTE.`);
      return;
    }

    // ── 3. Verifye balans egal sa nou atann ─────────────────────────────────
    const currentBalance = Number(user.wallet.balance);
    if (currentBalance !== EXPECTED_BALANCE_HTG) {
      console.error(
        `✗ Balans wallet aktyèl (${currentBalance} HTG) PA egal ${EXPECTED_BALANCE_HTG} HTG atann lan — ` +
        `sa vle di gen lòt tranzaksyon ki rive antretan. ARÈTE, envestige anvan w kontinye.`
      );
      return;
    }
    console.log(`\n  ✓ Balans wallet la egal egzakteman ${EXPECTED_BALANCE_HTG} HTG.`);

    // ── 4. Verifye balans apre egal egzakteman 100 HTG ──────────────────────
    const balanceAfter = Math.round((currentBalance - WITHDRAW_AMOUNT_HTG) * 100) / 100;
    if (balanceAfter !== TARGET_REMAINING_HTG) {
      console.error(`✗ Soustraksyon (${WITHDRAW_AMOUNT_HTG} HTG) ta kite ${balanceAfter} HTG, PA ${TARGET_REMAINING_HTG} HTG atann lan — ARÈTE.`);
      return;
    }

    console.log('── Rezime konplè ─────────────────────────────────────────────');
    console.log(`  Balans wallet ANVAN:                     ${currentBalance} HTG`);
    console.log(`  Retrè administratif (retire eksè a):     -${WITHDRAW_AMOUNT_HTG} HTG`);
    console.log(`  Balans wallet APRE:                      ${balanceAfter} HTG (dwe egal ${TARGET_REMAINING_HTG} HTG — MATCH ✓)`);
    console.log('─────────────────────────────────────────────────────────────');

    console.log('── Aksyon planifye ─────────────────────────────────────────');
    console.log(`  1. wallet.update: balance -= ${WITHDRAW_AMOUNT_HTG} HTG (wallet ${user.wallet.id})`);
    console.log(`  2. Transaction.create (NOUVO antre, PA touche okenn ansyen Transaction):`);
    console.log(`     type=WITHDRAWAL, status=COMPLETED, senderWalletId=${user.wallet.id}, amount=${WITHDRAW_AMOUNT_HTG}, fee=0`);
    console.log(`     method="MANUAL-CORRECTION"`);
    console.log(`     description="${NARRATIVE}"`);
    console.log('─────────────────────────────────────────────────────────────');

    if (!confirm) {
      console.log('\n[DRY-RUN] Pa gen okenn ekri BDD. Kouri ak --confirm pou egzekite pou tout bon.');
      return;
    }

    console.log('\n[LIVE] Soustè wallet la kounye a...');
    const [, transaction] = await prisma.$transaction([
      prisma.wallet.update({
        where: { id: user.wallet.id },
        data: { balance: { decrement: WITHDRAW_AMOUNT_HTG } },
      }),
      prisma.transaction.create({
        data: {
          reference: `ADM-WD-KIARA-${Date.now()}`,
          senderWalletId: user.wallet.id,
          amount: WITHDRAW_AMOUNT_HTG,
          fee: 0,
          netAmount: WITHDRAW_AMOUNT_HTG,
          type: 'WITHDRAWAL',
          status: 'COMPLETED',
          method: 'MANUAL-CORRECTION',
          title: `Retrè administratif — ${WITHDRAW_AMOUNT_HTG} HTG`,
          description: NARRATIVE,
        },
      }),
    ]);
    console.log(`  ✓ Wallet soustè -${WITHDRAW_AMOUNT_HTG} HTG`);
    console.log(`  ✓ Transaction kreye: ${transaction.id} (${transaction.reference})`);

    const walletAfter = await prisma.wallet.findUnique({ where: { id: user.wallet.id } });
    console.log(`  ✓ Balans final verifye nan BDD: ${walletAfter?.balance} HTG`);

    console.log('\n[LIVE] Fini.');
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
