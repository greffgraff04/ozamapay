/**
 * cancel-duplicate-credit-wendy-dominique.ts
 *
 * Script one-off, egzekite yon sèl fwa (9 out 2026) pou kliyan
 * dominiquewnd@gmail.com (DominiqueWendy). PA reyize pou lòt kliyan san
 * apwobasyon biznis, dat, ak rezon klè.
 *
 * KONTEKS: menm kredi manyèl 1,880 HTG te fèt PA ERÈ 2 FWA sou wallet
 * DominiqueWendy, 7 segonn apa (referans ${FIRST_REFERENCE} ak
 * ${SECOND_REFERENCE}, tou de "Depo Administratè ki pwogrese pa Pipeline
 * Santral", type TOPUP). Balans aktyèl: 3,760 HTG (2× 1,880). Envestigasyon
 * konfime: (1) sèl 2 Transaction sa yo egziste sou wallet la, (2) status
 * KYC li se PENDING — PA APPROVED, e pa gen okenn dediksyon frè KYC sou
 * wallet la, kontrèman ak sa ki te kwè okòmansman. Script la soustè YON SÈL
 * 1,880 HTG (anile 2yèm kredi a, ${SECOND_REFERENCE}, ki kwonolojikman
 * dupliye premye a) pou balans final la tounen 1,880 HTG — kantite yon sèl
 * kredi kòrèk. SAN touche okenn nan 2 Transaction orijinal yo — kreye yon
 * TWAZYÈM antre ki make kle kòm anilasyon.
 *
 * Safety: DRY-RUN pa default. Verifye (1) wallet la egal EGZAKTEMAN 3,760
 * HTG anvan soustraksyon, (2) egzakteman 2 Transaction egziste sou wallet
 * la e yo matche 2 referans atann yo (montre tout Transaction pou
 * konfimasyon vizyèl), (3) pa gen deja yon Transaction anilasyon pou menm
 * referans lan (anpeche doub-egzekisyon), (4) balans apre soustraksyon an
 * pa negatif. Kouri ak --confirm pou egzekite pou tout bon.
 *
 * Kòmand (nan /backend):
 *   npx ts-node --transpile-only scripts/one-off/cancel-duplicate-credit-wendy-dominique.ts            # dry-run
 *   npx ts-node --transpile-only scripts/one-off/cancel-duplicate-credit-wendy-dominique.ts --confirm  # live
 */

import { NestFactory } from '@nestjs/core';
import { StrowalletModule } from '../../src/strowallet/strowallet.module';
import { PrismaService } from '../../src/prisma/prisma.service';

const CUSTOMER_EMAIL = 'dominiquewnd@gmail.com';
const FIRST_REFERENCE = 'ADM-TP-1786293755539-1964';
const SECOND_REFERENCE = 'ADM-TP-1786293762163-2875'; // dwoub la — sa n ap anile a
const EXPECTED_BALANCE_HTG = 3760;
const CANCEL_AMOUNT_HTG = 1880;
const NARRATIVE = `Anilasyon — youn nan 2 kredi dwoub ki te fèt pa erè (referans anile: ${SECOND_REFERENCE})`;

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
    console.log(`  KYC:     ${user.kyc?.status ?? 'AUCUN dosye'}`);
    console.log(`  wallet:  ${user.wallet.id} | balans aktyèl: ${user.wallet.balance} HTG`);

    // ── 2. Montre tout Transaction pou konfimasyon vizyèl ────────────────────
    const allTxs = await prisma.transaction.findMany({
      where: { OR: [{ senderWalletId: user.wallet.id }, { receiverWalletId: user.wallet.id }] },
      orderBy: { createdAt: 'asc' },
    });
    console.log(`\n── Tout Transaction sou wallet la (${allTxs.length}) ──────────────`);
    for (const t of allTxs) {
      console.log(`  ${t.createdAt.toISOString()} [${t.status}] ${t.type} amount=${t.amount} ref=${t.reference}`);
      console.log(`    desc="${t.description}"`);
    }

    if (allTxs.length !== 2) {
      console.error(
        `\n✗ ATANSYON: gen ${allTxs.length} Transaction sou wallet sa a, PA 2 jan envestigasyon anvan an te montre. ` +
        `ARÈTE, verifye si gen lòt aktivite ki ta fè anilasyon an pwoblèm.`
      );
      return;
    }
    const firstTx = allTxs.find((t) => t.reference === FIRST_REFERENCE);
    const secondTx = allTxs.find((t) => t.reference === SECOND_REFERENCE);
    if (!firstTx || !secondTx) {
      console.error(`\n✗ Pa jwenn tou de referans atann yo (${FIRST_REFERENCE} / ${SECOND_REFERENCE}) — ARÈTE.`);
      return;
    }
    console.log(`\n  ✓ Tou de kredi dwoub yo konfime: ${firstTx.reference} (rete) + ${secondTx.reference} (pral anile)`);

    // ── 3. Anpeche doub-anilasyon ────────────────────────────────────────────
    const existingCancel = await prisma.transaction.findFirst({
      where: { AND: [{ description: { contains: 'Anilasyon' } }, { description: { contains: SECOND_REFERENCE } }] },
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
    console.log(`  Anilasyon (retire YON SÈL kredi dwoub):  -${CANCEL_AMOUNT_HTG} HTG`);
    console.log(`  Balans wallet APRE:                      ${balanceAfter} HTG`);
    console.log(`  (dwe egal montan yon sèl kredi kòrèk: ${EXPECTED_BALANCE_HTG - CANCEL_AMOUNT_HTG} HTG — ${balanceAfter === EXPECTED_BALANCE_HTG - CANCEL_AMOUNT_HTG ? 'MATCH ✓' : 'PA MATCH ✗'})`);
    console.log('─────────────────────────────────────────────────────────────');

    console.log('── Aksyon planifye ─────────────────────────────────────────');
    console.log(`  1. wallet.update: balance -= ${CANCEL_AMOUNT_HTG} HTG (wallet ${user.wallet.id})`);
    console.log(`  2. Transaction.create (NOUVO antre, PA touche ${FIRST_REFERENCE} ni ${SECOND_REFERENCE}):`);
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
          reference: `${SECOND_REFERENCE}-CANCEL`,
          senderWalletId: user.wallet.id,
          amount: CANCEL_AMOUNT_HTG,
          fee: 0,
          netAmount: CANCEL_AMOUNT_HTG,
          type: 'WITHDRAWAL',
          status: 'COMPLETED',
          method: 'MANUAL-CORRECTION',
          title: `Anilasyon kredi dwoub — ${CANCEL_AMOUNT_HTG} HTG`,
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
