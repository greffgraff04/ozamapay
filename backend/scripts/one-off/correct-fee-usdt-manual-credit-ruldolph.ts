/**
 * correct-fee-usdt-manual-credit-ruldolph.ts
 *
 * Script one-off, egzekite yon sèl fwa (8 out 2026) pou kliyan
 * ruldolph2004@gmail.com. PA reyize pou lòt kliyan san apwobasyon biznis,
 * dat, ak rezon klè.
 *
 * KONTEKS: manual-credit-usdt-wrong-address-ruldolph.ts te kredite wallet
 * Rudolph a ak 0% frè (3,545.06 HTG, baze sou 26.066613 USDT × 136 —
 * jistifikasyon lè sa a: TronMonitorService.creditDeposit() aplike fee: 0
 * pou depo USDT otomatik yo). CEO deside apre kou: 6% frè DWE aplike sou
 * konpansasyon manyèl sa a tou (menm jan ak lòt operasyon manyèl), pa 0%.
 *
 * Montan KÒREK: 26.066613 × 0.94 = 24.502616 USDT × 136 (MENM rate ak
 * tranzaksyon orijinal la, PA Rate.USDT_HTG aktyèl — rate ka chanje depi
 * 8 out) = 3,332.36 HTG.
 * Diferans pou soustre: 3,545.06 − 3,332.36 = 212.70 HTG.
 *
 * Script la PA modifye premye Transaction (USDT-MANUAL-6EAD9E96A19A) — li
 * kreye yon DEZYÈM antre Transaction (WITHDRAWAL, senderWalletId = wallet
 * Rudolph) pou gen tras klè de operasyon separe: kredi orijinal la ak
 * korije frè a.
 *
 * Safety: DRY-RUN pa default. Verifye (1) balans wallet la egal EGZAKTEMAN
 * 3,545.06 HTG anvan soustraksyon (garanti pa gen lòt tranzaksyon ki rive
 * antretan ki ta fè soustraksyon an pwoblèm), (2) rekalkile 212.70 HTG a
 * apati fòmil la epi konfime li matche valè ateste a (2 dèsimal), (3)
 * verifye pa gen deja yon Transaction "Korije frè 6%" pou menm TxID (anpeche
 * doub-egzekisyon). Kouri ak --confirm pou egzekite pou tout bon.
 *
 * Kòmand (nan /backend):
 *   npx ts-node --transpile-only scripts/one-off/correct-fee-usdt-manual-credit-ruldolph.ts            # dry-run
 *   npx ts-node --transpile-only scripts/one-off/correct-fee-usdt-manual-credit-ruldolph.ts --confirm  # live
 */

import { NestFactory } from '@nestjs/core';
import { StrowalletModule } from '../../src/strowallet/strowallet.module';
import { PrismaService } from '../../src/prisma/prisma.service';

const CUSTOMER_EMAIL = 'ruldolph2004@gmail.com';
const TX_HASH = '6e5e353ec9e143cdaa6204d66ef8891397951527585de1d3de09bccda9900be9';
const ORIGINAL_REFERENCE = 'USDT-MANUAL-6EAD9E96A19A';
const AMOUNT_USDT_NET = 26.066613;
const RATE_USED_ORIGINALLY = 136; // rate egzat lè premye kredi a te fèt (8 out) — PA rate aktyèl
const FEE_PCT = 0.06;
const EXPECTED_ORIGINAL_HTG = 3545.06;
const EXPECTED_CORRECT_HTG = 3332.36;
const EXPECTED_CORRECTION_HTG = 212.70;
const NARRATIVE = `Korije frè 6% — ajisteman sou konpansasyon manyèl TxID ${TX_HASH}`;

async function main() {
  const confirm = process.argv.includes('--confirm');

  const app = await NestFactory.createApplicationContext(StrowalletModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);

  try {
    // ── 1. Jwenn kliyan an ────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
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

    // ── 2. Verifye premye Transaction lan egziste, PA touche l ─────────────
    const original = await prisma.transaction.findUnique({ where: { reference: ORIGINAL_REFERENCE } });
    if (!original) {
      console.error(`✗ Pa jwenn premye Transaction (${ORIGINAL_REFERENCE}) — ARÈTE, verifye referans lan.`);
      return;
    }
    if (Number(original.amount) !== EXPECTED_ORIGINAL_HTG) {
      console.error(`✗ Premye Transaction gen amount=${original.amount}, atann ${EXPECTED_ORIGINAL_HTG} — ARÈTE.`);
      return;
    }
    console.log(`  ✓ Premye Transaction konfime: ${original.reference}, amount=${original.amount} HTG (PA MODIFYE)`);

    // ── 3. Anpeche doub-egzekisyon ──────────────────────────────────────────
    const existingCorrection = await prisma.transaction.findFirst({
      where: { description: { contains: 'Korije frè 6%' } },
    });
    if (existingCorrection) {
      console.error(`✗ Gen deja yon Transaction korije frè (${existingCorrection.reference}) — ARÈTE, pa soustre ankò.`);
      return;
    }

    // ── 4. Verifye balans wallet la egal EGZAKTEMAN sa nou atann ───────────
    const currentBalance = Number(user.wallet.balance);
    if (currentBalance !== EXPECTED_ORIGINAL_HTG) {
      console.error(
        `✗ Balans wallet aktyèl (${currentBalance} HTG) PA egal ${EXPECTED_ORIGINAL_HTG} HTG atann lan — ` +
        `sa vle di gen lòt tranzaksyon ki rive antretan. ARÈTE, envestige anvan w kontinye.`
      );
      return;
    }
    console.log(`  ✓ Balans wallet la egal egzakteman ${EXPECTED_ORIGINAL_HTG} HTG — okenn lòt tranzaksyon pa rive antretan.`);

    // ── 5. Rekalkile 212.70 HTG a apati fòmil la (double-check) ────────────
    const originalHtgRecalc = Math.round(AMOUNT_USDT_NET * RATE_USED_ORIGINALLY * 100) / 100;
    const correctHtgRecalc = Math.round(AMOUNT_USDT_NET * (1 - FEE_PCT) * RATE_USED_ORIGINALLY * 100) / 100;
    const correctionHtgRecalc = Math.round((originalHtgRecalc - correctHtgRecalc) * 100) / 100;

    console.log('── Dekonpozisyon kalkil la (double-check) ──────────────────');
    console.log(`  ${AMOUNT_USDT_NET} USDT × ${RATE_USED_ORIGINALLY} (rate orijinal)         = ${originalHtgRecalc} HTG (0% frè, deja kredite)`);
    console.log(`  ${AMOUNT_USDT_NET} USDT × (1 − ${FEE_PCT}) × ${RATE_USED_ORIGINALLY}       = ${correctHtgRecalc} HTG (6% frè, KÒREK)`);
    console.log(`  Diferans pou soustre                            = ${correctionHtgRecalc} HTG`);
    console.log('─────────────────────────────────────────────────────────────');

    if (
      originalHtgRecalc !== EXPECTED_ORIGINAL_HTG ||
      correctHtgRecalc !== EXPECTED_CORRECT_HTG ||
      correctionHtgRecalc !== EXPECTED_CORRECTION_HTG
    ) {
      console.error(
        `✗ Rekalkil la PA matche valè ateste yo (atann ${EXPECTED_ORIGINAL_HTG}/${EXPECTED_CORRECT_HTG}/${EXPECTED_CORRECTION_HTG}, ` +
        `jwenn ${originalHtgRecalc}/${correctHtgRecalc}/${correctionHtgRecalc}) — ARÈTE, pa gen match.`
      );
      return;
    }
    console.log('  ✓ Rekalkil la matche egzakteman valè ateste yo.');

    const correctionHtg = correctionHtgRecalc;
    const balanceAfter = Math.round((currentBalance - correctionHtg) * 100) / 100;

    console.log('── Rezime konplè ─────────────────────────────────────────────');
    console.log(`  Balans wallet ANVAN:                     ${currentBalance} HTG`);
    console.log(`  Soustraksyon (korije frè 6%):            -${correctionHtg} HTG`);
    console.log(`  Balans wallet APRE:                      ${balanceAfter} HTG`);
    console.log(`  (dwe egal montan KÒREK 6% frè a: ${EXPECTED_CORRECT_HTG} HTG — ${balanceAfter === EXPECTED_CORRECT_HTG ? 'MATCH ✓' : 'PA MATCH ✗'})`);
    console.log('─────────────────────────────────────────────────────────────');

    console.log('── Aksyon planifye ─────────────────────────────────────────');
    console.log(`  1. wallet.update: balance -= ${correctionHtg} HTG (wallet ${user.wallet.id})`);
    console.log(`  2. Transaction.create (NOUVO antre, PA modifye ${ORIGINAL_REFERENCE}):`);
    console.log(`     type=WITHDRAWAL, status=COMPLETED, senderWalletId=${user.wallet.id}, amount=${correctionHtg}, fee=0`);
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
        data: { balance: { decrement: correctionHtg } },
      }),
      prisma.transaction.create({
        data: {
          reference: `${ORIGINAL_REFERENCE}-FEECORR6PCT`,
          senderWalletId: user.wallet.id,
          amount: correctionHtg,
          fee: 0,
          netAmount: correctionHtg,
          type: 'WITHDRAWAL',
          status: 'COMPLETED',
          method: 'MANUAL-CORRECTION',
          title: `Korije frè 6% — ${correctionHtg} HTG`,
          description: NARRATIVE,
        },
      }),
    ]);
    console.log(`  ✓ Wallet soustè -${correctionHtg} HTG`);
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
