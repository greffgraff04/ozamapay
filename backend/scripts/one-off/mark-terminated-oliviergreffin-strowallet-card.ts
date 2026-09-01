/**
 * mark-terminated-oliviergreffin-strowallet-card.ts
 *
 * Script one-off, egzekite yon sèl fwa (1 sept 2026) pou kliyan
 * oliviergreffin20@gmail.com. PA reyize pou lòt kliyan san apwobasyon
 * biznis, dat, ak rezon klè.
 *
 * KONTEKS: kont sa a gen 2 kat vityèl kounye a — ansyen kat StroWallet
 * (cardId 6a769a73623df0ee0e3f410d, $9.39) ki te ranplase pa nouvo kat
 * BSICards Mastercard EUR (dashboard kliyan an montre EUR a kounye a, wè
 * CardsService). Opsyon 2 konfime ak itilizatè a: PA rele StroWallet API
 * (pa gen apèl "terminate-card" reyèl), sèlman aliyen BDD lokal nou pou
 * retire ansyen kat la epi ranbouse balans $9.39 ki rete a bay kliyan an
 * nan wallet HTG li (konvèti nan to USD_HTG aktyèl).
 *
 * Script la (1) verifye kat la egziste, apatyen a kliyan sa a, status
 * ACTIVE, balans EGZAKTEMAN $9.39 (anpeche egzekisyon si sitiyasyon an
 * chanje), (2) mete status=TERMINATED + balanceAtTermination + terminatedAt,
 * (3) kredite wallet HTG kliyan an ak $9.39 konvèti nan to USD_HTG aktyèl,
 * (4) kreye Transaction (COMPLETED) + LedgerEntry pou tras odit konplè —
 * menm apwòch ak fix-giftcard-order-4cb7cca1-reloadly-path-bug.ts pi bonè
 * jodi a.
 *
 * Safety: DRY-RUN pa default. Verifye idantite kat/kliyan, balans egzak
 * $9.39, epi tcheke pa gen deja yon Transaction ak menm reference (anpeche
 * doub-egzekisyon). Kouri ak --confirm pou egzekite pou tout bon.
 *
 * Kòmand (nan /backend):
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/mark-terminated-oliviergreffin-strowallet-card.ts            # dry-run
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/mark-terminated-oliviergreffin-strowallet-card.ts --confirm  # live
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

const CARD_ID = '6a769a73623df0ee0e3f410d';
const CUSTOMER_EMAIL = 'oliviergreffin20@gmail.com';
const EXPECTED_BALANCE = 9.39;

async function main() {
  const confirm = process.argv.includes('--confirm');
  const prisma = new PrismaClient();

  try {
    // ── 1. Jwenn kat la nan BDD ──────────────────────────────────────────────
    const card = await prisma.virtualCard.findUnique({
      where: { cardId: CARD_ID },
      include: { user: { include: { wallet: true } } },
    });
    if (!card) {
      console.error(`✗ Pa jwenn VirtualCard ak cardId ${CARD_ID} — ARÈTE`);
      return;
    }
    if (card.user.email.toLowerCase() !== CUSTOMER_EMAIL.toLowerCase()) {
      console.error(`✗ Kat sa a pa apatyen a ${CUSTOMER_EMAIL} (li apatyen a ${card.user.email}) — ARÈTE`);
      return;
    }
    if (card.status !== 'ACTIVE') {
      console.error(`✗ Kat la deja gen status="${card.status}" (pa ACTIVE) — deja trete? ARÈTE, verifye.`);
      return;
    }
    if (card.provider !== 'STROWALLET_NFC') {
      console.error(`✗ Provider="${card.provider}" (pa STROWALLET_NFC) — ARÈTE, verifye w gen bon kat la.`);
      return;
    }

    const balanceNow = Number(card.balance);
    if (Math.abs(balanceNow - EXPECTED_BALANCE) > 0.001) {
      console.error(`✗ Balans kat la se $${balanceNow}, PA $${EXPECTED_BALANCE} atann — ARÈTE, sitiyasyon an chanje.`);
      return;
    }

    const wallet = card.user.wallet;
    if (!wallet) {
      console.error(`✗ Pa jwenn wallet pou ${CUSTOMER_EMAIL} — ARÈTE`);
      return;
    }

    // ── 2. To echanj aktyèl (li fre, pa sipoze) ──────────────────────────────
    const rate = await prisma.rate.findUnique({ where: { key: 'USD_HTG' } });
    if (!rate) {
      console.error('✗ Rate USD_HTG pa jwenn — ARÈTE');
      return;
    }
    const exchangeRate = Number(rate.value);
    const htgRefund = Math.round(EXPECTED_BALANCE * exchangeRate * 100) / 100;

    const walletBefore = Number(wallet.balance);
    const walletAfter = Math.round((walletBefore + htgRefund) * 100) / 100;

    console.log('── Kliyan ────────────────────────────────────────────────────');
    console.log(`  ${card.user.name} (${card.user.email})`);
    console.log(`  wallet: ${wallet.id} | balans aktyèl: ${walletBefore} HTG`);
    console.log(`  Kat BDD: cardId=${card.cardId} provider=${card.provider} status=${card.status} balans=$${balanceNow}`);
    console.log(`  To USD_HTG aktyèl: ${exchangeRate}`);

    console.log('\n── Rezime konplè ────────────────────────────────────────────');
    console.log(`  VirtualCard.status:  ACTIVE → TERMINATED`);
    console.log(`  VirtualCard.balanceAtTermination: $${EXPECTED_BALANCE}`);
    console.log(`  VirtualCard.terminatedAt: ${new Date().toISOString()}`);
    console.log(`  Wallet HTG (${wallet.id}): ${walletBefore} → ${walletAfter} HTG (+${htgRefund})`);
    console.log('─────────────────────────────────────────────────────────────');

    if (!confirm) {
      console.log('\n[DRY-RUN] Pa gen okenn ekri BDD. Kouri ak --confirm pou egzekite pou tout bon.');
      return;
    }

    const reference = `CARD-TERMINATE-REFUND-${CARD_ID}`;
    const existingTx = await prisma.transaction.findUnique({ where: { reference } });
    if (existingTx) {
      console.error(`✗ Gen deja yon Transaction (${existingTx.id}) ak reference sa a — ARÈTE, pa egzekite ankò.`);
      return;
    }

    console.log('\n[LIVE] Ekri chanjman yo...');
    const result = await prisma.$transaction(async (t) => {
      const updatedCard = await t.virtualCard.update({
        where: { cardId: CARD_ID },
        data: { status: 'TERMINATED', balanceAtTermination: EXPECTED_BALANCE, terminatedAt: new Date() },
      });

      const updatedWallet = await t.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: htgRefund } },
      });

      const transaction = await t.transaction.create({
        data: {
          reference,
          senderWalletId: wallet.id,
          amount: htgRefund,
          fee: 0,
          netAmount: htgRefund,
          type: 'CARD',
          status: 'COMPLETED',
          method: 'MANUAL-CORRECTION',
          title: 'Ranbousman ansyen kat StroWallet (ranplase pa BSICards EUR)',
          description:
            `Kat StroWallet ${CARD_ID} mete TERMINATED (BDD lokal sèlman, pa gen apèl StroWallet API) — ` +
            `ranplase pa kat BSICards Mastercard EUR nan dashboard kliyan an. Balans $${EXPECTED_BALANCE} ` +
            `ki te rete a ranbouse nan wallet HTG li (to ${exchangeRate}).`,
        },
      });

      await t.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          transactionId: transaction.id,
          type: 'CREDIT',
          amount: htgRefund,
          balanceBefore: walletBefore,
          balanceAfter: walletAfter,
          description: `Ranbousman balans kat StroWallet terminen (${CARD_ID})`,
        },
      });

      return { updatedCard, updatedWallet, transaction };
    }, { isolationLevel: 'Serializable' });

    console.log(`  ✓ VirtualCard ${result.updatedCard.id} → status=${result.updatedCard.status}`);
    console.log(`  ✓ Wallet → ${result.updatedWallet.balance} HTG`);
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
