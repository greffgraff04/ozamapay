/**
 * cancel-manual-credit-monique-payen.ts
 *
 * Script one-off, egzekite yon sèl fwa (9 out 2026) pou kliyan
 * moniquepayen182@gmail.com (Monique Payen, status "NO KYC"). PA reyize pou
 * lòt kliyan san apwobasyon biznis, dat, ak rezon klè.
 *
 * KONTEKS: yon kredi manyèl 1,880 HTG te fèt PA ERÈ sou wallet Monique Payen
 * (referans ${ORIGINAL_REFERENCE}, "Depo Administratè ki pwogrese pa Pipeline
 * Santral", type TOPUP, sèl Transaction ki egziste sou wallet li — konfime
 * pa gen okenn lòt aktivite sou kont sa a depi). Script la soustè 1,880 HTG
 * pou anile kredi a nèt, SAN touche premye Transaction lan — kreye yon
 * DEZYÈM antre ki make kle kòm anilasyon, pou gen tras klè de operasyon
 * separe yo.
 *
 * Safety: DRY-RUN pa default. Verifye (1) wallet la egal EGZAKTEMAN 1,880
 * HTG anvan soustraksyon (garanti pa gen lòt tranzaksyon ki rive antretan),
 * (2) sèl Transaction ki egziste sou wallet la se kredi manyèl erè a (montre
 * tout Transaction resan pou konfimasyon vizyèl), (3) pa gen deja yon
 * Transaction anilasyon pou menm referans lan (anpeche doub-egzekisyon),
 * (4) balans apre soustraksyon an pa negatif. Kouri ak --confirm pou
 * egzekite pou tout bon.
 *
 * Kòmand (nan /backend):
 *   npx ts-node --transpile-only scripts/one-off/cancel-manual-credit-monique-payen.ts            # dry-run
 *   npx ts-node --transpile-only scripts/one-off/cancel-manual-credit-monique-payen.ts --confirm  # live
 */

import { NestFactory } from '@nestjs/core';
import { StrowalletModule } from '../../src/strowallet/strowallet.module';
import { PrismaService } from '../../src/prisma/prisma.service';

const CUSTOMER_EMAIL = 'moniquepayen182@gmail.com';
const ORIGINAL_REFERENCE = 'ADM-TP-1786293605152-8056';
const EXPECTED_BALANCE_HTG = 1880;
const CANCEL_AMOUNT_HTG = 1880;
const NARRATIVE = `Anilasyon — kredi manyèl ki te fèt pa erè (referans orijinal: ${ORIGINAL_REFERENCE})`;

async function main() {
  const confirm = process.argv.includes('--confirm');

  const app = await NestFactory.createApplicationContext(StrowalletModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);

  try {
    // ── 1. Jwenn kliyan an ────────────────────────────────────────────────
    const user = await prisma.user.findFirst({
      where: { email: CUSTOMER_EMAIL },
      include: { wallet: true, kyc: true },
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
    console.log(`  KYC:     ${user.kyc?.status ?? 'AUCUN dosye (NO KYC)'}`);
    console.log(`  wallet:  ${user.wallet.id} | balans aktyèl: ${user.wallet.balance} HTG`);

    // ── 2. Montre tout Transaction resan pou konfimasyon vizyèl ─────────────
    const recentTxs = await prisma.transaction.findMany({
      where: { OR: [{ senderWalletId: user.wallet.id }, { receiverWalletId: user.wallet.id }] },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });
    console.log(`\n── Tout Transaction sou wallet la (${recentTxs.length}) ──────────────`);
    for (const t of recentTxs) {
      console.log(`  ${t.createdAt.toISOString()} [${t.status}] ${t.type} amount=${t.amount} ref=${t.reference}`);
      console.log(`    desc="${t.description}"`);
    }

    const originalTx = recentTxs.find((t) => t.reference === ORIGINAL_REFERENCE);
    if (!originalTx) {
      console.error(`\n✗ Pa jwenn Transaction ak referans ${ORIGINAL_REFERENCE} sou wallet sa a — ARÈTE, verifye referans lan.`);
      return;
    }
    console.log(`\n  ✓ Kredi manyèl erè a konfime: ${originalTx.reference}, amount=${originalTx.amount} HTG, "${originalTx.description}"`);

    if (recentTxs.length !== 1) {
      console.error(
        `\n✗ ATANSYON: gen ${recentTxs.length} Transaction sou wallet sa a, PA 1 sèl jan envestigasyon anvan an te montre. ` +
        `ARÈTE, verifye si gen lòt aktivite ki ta fè anilasyon an pwoblèm.`
      );
      return;
    }

    // ── 3. Anpeche doub-anilasyon ────────────────────────────────────────────
    const existingCancel = await prisma.transaction.findFirst({
      where: { AND: [{ description: { contains: 'Anilasyon' } }, { description: { contains: ORIGINAL_REFERENCE } }] },
    });
    if (existingCancel) {
      console.error(`✗ Gen deja yon Transaction anilasyon (${existingCancel.reference}) pou menm referans lan — ARÈTE.`);
      return;
    }

    // ── 4. Verifye balans egal sa nou atann ─────────────────────────────────
    const currentBalance = Number(user.wallet.balance);
    if (currentBalance !== EXPECTED_BALANCE_HTG) {
      console.error(
        `✗ Balans wallet aktyèl (${currentBalance} HTG) PA egal ${EXPECTED_BALANCE_HTG} HTG atann lan — ` +
        `sa vle di gen lòt tranzaksyon ki rive antretan. ARÈTE, envestige anvan w kontinye.`
      );
      return;
    }
    console.log(`\n  ✓ Balans wallet la egal egzakteman ${EXPECTED_BALANCE_HTG} HTG.`);

    // ── 5. Verifye balans apre pa negatif ───────────────────────────────────
    const balanceAfter = Math.round((currentBalance - CANCEL_AMOUNT_HTG) * 100) / 100;
    if (balanceAfter < 0) {
      console.error(`✗ Soustraksyon (${CANCEL_AMOUNT_HTG} HTG) ta fè balans la negatif (${balanceAfter} HTG) — ARÈTE.`);
      return;
    }

    console.log('── Rezime konplè ─────────────────────────────────────────────');
    console.log(`  Balans wallet ANVAN:                     ${currentBalance} HTG`);
    console.log(`  Anilasyon (retire kredi manyèl erè a):   -${CANCEL_AMOUNT_HTG} HTG`);
    console.log(`  Balans wallet APRE:                      ${balanceAfter} HTG`);
    console.log('─────────────────────────────────────────────────────────────');

    console.log('── Aksyon planifye ─────────────────────────────────────────');
    console.log(`  1. wallet.update: balance -= ${CANCEL_AMOUNT_HTG} HTG (wallet ${user.wallet.id})`);
    console.log(`  2. Transaction.create (NOUVO antre, PA touche ${ORIGINAL_REFERENCE}):`);
    console.log(`     type=WITHDRAWAL, status=COMPLETED, senderWalletId=${user.wallet.id}, amount=${CANCEL_AMOUNT_HTG}, fee=0`);
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
        data: { balance: { decrement: CANCEL_AMOUNT_HTG } },
      }),
      prisma.transaction.create({
        data: {
          reference: `${ORIGINAL_REFERENCE}-CANCEL`,
          senderWalletId: user.wallet.id,
          amount: CANCEL_AMOUNT_HTG,
          fee: 0,
          netAmount: CANCEL_AMOUNT_HTG,
          type: 'WITHDRAWAL',
          status: 'COMPLETED',
          method: 'MANUAL-CORRECTION',
          title: `Anilasyon kredi manyèl — ${CANCEL_AMOUNT_HTG} HTG`,
          description: NARRATIVE,
        },
      }),
    ]);
    console.log(`  ✓ Wallet soustè -${CANCEL_AMOUNT_HTG} HTG`);
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
