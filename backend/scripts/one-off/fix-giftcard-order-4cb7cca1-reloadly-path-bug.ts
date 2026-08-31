/**
 * fix-giftcard-order-4cb7cca1-reloadly-path-bug.ts
 *
 * Script one-off, egzekite yon sèl fwa (31 out 2026) pou kliyan
 * oliviergreffin20@gmail.com. PA reyize pou lòt kòmand san apwobasyon
 * biznis, dat, ak rezon klè.
 *
 * KONTEKS: GiftCardOrder 4cb7cca1-76ec-46b3-97f9-fc4ba5102157 ($5 Visa
 * Prepaid, Reloadly transaction #1469934) te REYISI kote Reloadly —
 * kliyan resevwa imèl konfimasyon, mete kat la sou Apple Pay, e peye
 * avèk siksè. Men `giftcards.service.ts` te rele move chemen API a pou
 * rekipere redeem code la: `GET /orders/{id}/cards` olye vrè chemen
 * ofisyèl Reloadly a, `GET /orders/transactions/{id}/cards` (fiks
 * aplike separeman, menm dat, nan giftcards.service.ts L115/140/190).
 * Rezilta: apèl 404, kòd nou an trete sa tankou tout kòmand lan te
 * echwe — li ranbouse 708.75 HTG nan wallet kliyan an e make
 * GiftCardOrder FAILED, alòske Reloadly deja chaje nou pou yon kat ki
 * reyèlman egziste e deja itilize. Kliyan an te fini ak DOUB VALÈ: kat
 * la (deja itilize) + ranbousman 708.75 HTG.
 *
 * Script la (1) rekipere vrè cardNumber/pinCode kote Reloadly (chemen
 * korije a), (2) mete GiftCardOrder status=COMPLETED ak redeemCode
 * reyèl la, (3) ranvèse ranbousman an (wallet kliyan -708.75 HTG,
 * wallet MASTER +33.75 HTG majinal), (4) kreye Transaction +
 * LedgerEntry (2, youn pou chak wallet) pou gen tras odit konplè.
 *
 * Safety: DRY-RUN pa default. Verifye (1) GiftCardOrder egziste ak
 * status=FAILED, redeemCode=null (anpeche doub-egzekisyon), (2) Reloadly
 * konfime transaksyon 1469934 gen customIdentifier ki matche EGZAKTEMAN
 * orderId sa a e status=SUCCESSFUL anvan nenpòt ekri BDD. Kouri ak
 * --confirm pou egzekite pou tout bon.
 *
 * Kòmand (nan /backend):
 *   npx ts-node --transpile-only scripts/one-off/fix-giftcard-order-4cb7cca1-reloadly-path-bug.ts            # dry-run
 *   npx ts-node --transpile-only scripts/one-off/fix-giftcard-order-4cb7cca1-reloadly-path-bug.ts --confirm  # live
 */

import { PrismaClient } from '@prisma/client';

const ORDER_ID = '4cb7cca1-76ec-46b3-97f9-fc4ba5102157';
const RELOADLY_TX_ID = '1469934';
const MASTER_ID = process.env.OZAMAPAY_MASTER_ID as string;
const MARGIN = 0.05;

async function getReloadlyToken(): Promise<string> {
  const res = await fetch('https://auth.reloadly.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.RELOADLY_CLIENT_ID,
      client_secret: process.env.RELOADLY_CLIENT_SECRET,
      grant_type: 'client_credentials',
      audience: 'https://giftcards.reloadly.com',
    }),
  });
  if (!res.ok) throw new Error(`Reloadly auth failed: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

async function main() {
  const confirm = process.argv.includes('--confirm');
  const prisma = new PrismaClient();

  try {
    // ── 1. Verifye GiftCardOrder nan eta atann ─────────────────────────────
    const order = await prisma.giftCardOrder.findUnique({ where: { id: ORDER_ID } });
    if (!order) {
      console.error(`✗ GiftCardOrder ${ORDER_ID} pa jwenn — ARÈTE`);
      return;
    }
    if (order.status !== 'FAILED' || order.redeemCode) {
      console.error(`✗ GiftCardOrder gen status="${order.status}" redeemCode=${order.redeemCode ? 'PRESENT' : 'NULL'} — deja trete? ARÈTE, verifye.`);
      return;
    }
    console.log(`✓ GiftCardOrder confirme: ${order.id} status=${order.status} htgPaid=${order.htgPaid}`);

    // ── 2. Konfime kote Reloadly transaksyon an reyèlman SUCCESSFUL ────────
    const token = await getReloadlyToken();
    const txRes = await fetch(`https://giftcards.reloadly.com/reports/transactions/${RELOADLY_TX_ID}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/com.reloadly.giftcards-v1+json' },
    });
    if (!txRes.ok) throw new Error(`Reloadly transaction lookup failed: ${await txRes.text()}`);
    const tx = await txRes.json();
    if (tx.customIdentifier !== ORDER_ID) {
      console.error(`✗ customIdentifier Reloadly (${tx.customIdentifier}) pa matche ORDER_ID (${ORDER_ID}) — ARÈTE.`);
      return;
    }
    if (tx.status !== 'SUCCESSFUL') {
      console.error(`✗ Reloadly transaction status="${tx.status}" (pa SUCCESSFUL) — ARÈTE.`);
      return;
    }
    console.log(`✓ Reloadly konfime: transactionId=${tx.transactionId} status=${tx.status} customIdentifier matche`);

    // ── 3. Rekipere vrè redeem code (chemen korije a) ───────────────────────
    const cardsRes = await fetch(`https://giftcards.reloadly.com/orders/transactions/${RELOADLY_TX_ID}/cards`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/com.reloadly.giftcards-v1+json' },
    });
    if (!cardsRes.ok) throw new Error(`Reloadly cards fetch failed: ${await cardsRes.text()}`);
    const cards = await cardsRes.json();
    const redeemCode: string | null = cards?.[0]?.cardNumber ?? cards?.[0]?.pinCode ?? null;
    if (!redeemCode) {
      console.error('✗ Reloadly pa retounen okenn cardNumber/pinCode — ARÈTE.');
      return;
    }
    console.log(`✓ Redeem code rekipere kote Reloadly (len=${redeemCode.length}, last4=${redeemCode.slice(-4)})`);

    // ── 4. Jwenn wallets + kalkile ranvèsman an ─────────────────────────────
    const userWallet = await prisma.wallet.findUnique({ where: { userId: order.userId } });
    const masterWallet = await prisma.wallet.findUnique({ where: { userId: MASTER_ID } });
    if (!userWallet || !masterWallet) {
      console.error('✗ Wallet kliyan oswa wallet MASTER pa jwenn — ARÈTE');
      return;
    }

    const htgCost = Number(order.htgPaid); // 708.75 — ranbousman ki te fèt pa erè, pou ranvèse
    const marginHTG = Math.round(((htgCost * MARGIN) / (1 + MARGIN)) * 100) / 100; // 33.75

    const userBefore = Number(userWallet.balance);
    const userAfter = Math.round((userBefore - htgCost) * 100) / 100;
    const masterBefore = Number(masterWallet.balance);
    const masterAfter = Math.round((masterBefore + marginHTG) * 100) / 100;

    console.log('── Rezime konplè ─────────────────────────────────────────────');
    console.log(`  GiftCardOrder ${ORDER_ID}: FAILED → COMPLETED, redeemCode rekipere`);
    console.log(`  Wallet kliyan (${userWallet.id}): ${userBefore} → ${userAfter} HTG (-${htgCost})`);
    console.log(`  Wallet MASTER (${masterWallet.id}): ${masterBefore} → ${masterAfter} HTG (+${marginHTG})`);
    console.log('─────────────────────────────────────────────────────────────');

    if (!confirm) {
      console.log('\n[DRY-RUN] Pa gen okenn ekri BDD. Kouri ak --confirm pou egzekite pou tout bon.');
      return;
    }

    console.log('\n[LIVE] Ekri koreksyon an...');
    const reference = `GIFTCARD-${ORDER_ID}-CORRECTION`;
    const existingTx = await prisma.transaction.findUnique({ where: { reference } });
    if (existingTx) {
      console.error(`✗ Gen deja yon Transaction koreksyon (${existingTx.id}) pou kòmand sa a — ARÈTE, pa egzekite ankò.`);
      return;
    }

    const description =
      `Koreksyon — GiftCardOrder ${ORDER_ID} (Reloadly tx #${RELOADLY_TX_ID}) te REYISI kote ` +
      `Reloadly men bug chemen API (/orders/{id}/cards olye /orders/transactions/{id}/cards) te fè ` +
      `nou ranbouse kliyan an pa erè e make kòmand lan FAILED. Fiks aplike nan giftcards.service.ts. ` +
      `Koreksyon sa a ranvèse ranbousman initil la e konplete kòmand lan ak vrè redeem code.`;

    const result = await prisma.$transaction(async (t) => {
      const updatedOrder = await t.giftCardOrder.update({
        where: { id: ORDER_ID },
        data: { status: 'COMPLETED', redeemCode },
      });

      const updatedUserWallet = await t.wallet.update({
        where: { id: userWallet.id },
        data: { balance: { decrement: htgCost } },
      });

      const updatedMasterWallet = await t.wallet.update({
        where: { id: masterWallet.id },
        data: { balance: { increment: marginHTG } },
      });

      const transaction = await t.transaction.create({
        data: {
          reference,
          senderWalletId: userWallet.id,
          receiverWalletId: masterWallet.id,
          amount: htgCost,
          fee: 0,
          netAmount: htgCost,
          type: 'PAYMENT',
          status: 'COMPLETED',
          method: 'MANUAL-CORRECTION',
          title: 'Koreksyon kòmand gift card — bug chemen Reloadly',
          description,
        },
      });

      await t.ledgerEntry.create({
        data: {
          walletId: userWallet.id,
          transactionId: transaction.id,
          type: 'DEBIT',
          amount: htgCost,
          balanceBefore: userBefore,
          balanceAfter: userAfter,
          description: `Ranvèsman ranbousman initil (kòmand gift card ${ORDER_ID} te reyèlman reyisi)`,
        },
      });

      await t.ledgerEntry.create({
        data: {
          walletId: masterWallet.id,
          transactionId: transaction.id,
          type: 'CREDIT',
          amount: marginHTG,
          balanceBefore: masterBefore,
          balanceAfter: masterAfter,
          description: `Ranvèsman majinal (kòmand gift card ${ORDER_ID} te reyèlman reyisi)`,
        },
      });

      return { updatedOrder, updatedUserWallet, updatedMasterWallet, transaction };
    }, { isolationLevel: 'Serializable' });

    console.log(`  ✓ GiftCardOrder → ${result.updatedOrder.status}, redeemCode anrejistre`);
    console.log(`  ✓ Wallet kliyan → ${result.updatedUserWallet.balance} HTG`);
    console.log(`  ✓ Wallet MASTER → ${result.updatedMasterWallet.balance} HTG`);
    console.log(`  ✓ Transaction kreye: ${result.transaction.id} (${result.transaction.reference})`);
    console.log('\n[LIVE] Fini.');
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
