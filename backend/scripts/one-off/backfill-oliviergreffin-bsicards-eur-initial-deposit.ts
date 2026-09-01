/**
 * backfill-oliviergreffin-bsicards-eur-initial-deposit.ts
 *
 * Script one-off, egzekite yon sèl fwa (1 sept 2026) pou kliyan
 * oliviergreffin20@gmail.com. PA reyize pou lòt kliyan san apwobasyon
 * biznis, dat, ak rezon klè.
 *
 * KONTEKS: BSICardsMastercardEuroService.createCard() te jis korije (wè
 * bsicards-mastercard-euro.service.ts) pou chaje kliyan €3.00 (depo
 * minimòm) chak fwa yo kreye yon kat Mastercard EUR, epi senkwonize
 * VirtualCard.balance ak vrè €3.00 BSICards bay gratis la — men kat
 * Olivier a (cardId 6a962a96ed36d19c602cbe04) te deja kreye AVAN chanjman
 * sa a, kidonk li pa janm peye pou €3.00 a.
 *
 * ENVESTIGASYON (1 sept 2026, wè _check-olivier-bsicards-eur-balance-history.ts):
 * VirtualCard.balance li a se €6.58, PA €0 — kat la te kreye ak balans 0
 * (bug lan), epi Olivier te FÈ yon vrè rechaj apre (1000 HTG → €6.58,
 * Transaction BSICARDS-EUR-FUND-...-1788231472441, COMPLETED). Rechaj sa a
 * kòrèk, PA touche l. Sa vle di vrè balans BSICards la dwe €3.00 (gratis,
 * pa janm anrejistre lokal) + €6.58 (rechaj) = €9.58 — script la AJOUTE
 * €3.00 sou balans EGZISTAN an (increment), li PA ekrase l ak yon "set" flat
 * a €3.00 (sa ta efase vrè €6.58 rechaj la pa erè).
 *
 * Script la: (1) verifye kat la egziste, apatyen a kliyan sa a, provider
 * BSICARDS_MASTERCARD_EUR, status ACTIVE, (2) debite €3.00 (konvèti an HTG
 * ak to EUR_HTG AKTYÈL, pa yon ansyen to) nan wallet HTG kliyan an, (3)
 * INCREMENT VirtualCard.balance pa +3.00 (kèlkeswa valè li kounye a), (4)
 * kreye Transaction (COMPLETED) + LedgerEntry pou tras odit.
 *
 * Safety: DRY-RUN pa default. Si wallet la pa gen ase balans, ARÈTE san
 * aplike anyen pasyèlman. Tcheke pa gen deja yon Transaction ak menm
 * reference (anpeche doub-egzekisyon — sa a se sèl pwoteksyon kont
 * doub-egzekisyon, pa yon chèk sou balans kat la, paske balans lan ka
 * lejitimman diferan de 0). Kouri ak --confirm pou egzekite pou tout bon.
 *
 * Kòmand (nan /backend):
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/backfill-oliviergreffin-bsicards-eur-initial-deposit.ts            # dry-run
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/backfill-oliviergreffin-bsicards-eur-initial-deposit.ts --confirm  # live
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

const CARD_ID = '6a962a96ed36d19c602cbe04';
const CUSTOMER_EMAIL = 'oliviergreffin20@gmail.com';
const INITIAL_DEPOSIT_EUR = 3.0;

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
    if (card.provider !== 'BSICARDS_MASTERCARD_EUR') {
      console.error(`✗ Provider="${card.provider}" (pa BSICARDS_MASTERCARD_EUR) — ARÈTE, verifye w gen bon kat la.`);
      return;
    }
    if (card.status !== 'ACTIVE') {
      console.error(`✗ Kat la gen status="${card.status}" (pa ACTIVE) — ARÈTE, verifye.`);
      return;
    }
    const currentBalance = Number(card.balance);
    const newCardBalance = Math.round((currentBalance + INITIAL_DEPOSIT_EUR) * 100) / 100;

    const wallet = card.user.wallet;
    if (!wallet) {
      console.error(`✗ Pa jwenn wallet pou ${CUSTOMER_EMAIL} — ARÈTE`);
      return;
    }

    // ── 2. To echanj aktyèl (li fre, pa sipoze menm ak lè kat la te kreye) ──
    const rate = await prisma.rate.findUnique({ where: { key: 'EUR_HTG' } });
    if (!rate) {
      console.error('✗ Rate EUR_HTG pa jwenn — ARÈTE');
      return;
    }
    const exchangeRate = Number(rate.value);
    const htgCost = Math.ceil(INITIAL_DEPOSIT_EUR * exchangeRate);

    const walletBefore = Number(wallet.balance);
    if (walletBefore < htgCost) {
      console.error(
        `✗ Balans wallet ensifizan: ${walletBefore} HTG < ${htgCost} HTG bezwen — ARÈTE, ` +
          `pa aplike okenn chanjman pasyèl. Verifye ak kliyan an anvan reeseye.`,
      );
      return;
    }
    const walletAfter = walletBefore - htgCost;

    console.log('── Kliyan ────────────────────────────────────────────────────');
    console.log(`  ${card.user.name} (${card.user.email})`);
    console.log(`  wallet: ${wallet.id} | balans aktyèl: ${walletBefore} HTG`);
    console.log(`  Kat BSICards EUR BDD: cardId=${card.cardId} status=${card.status} balans=${card.balance}`);
    console.log(`  To EUR_HTG aktyèl: ${exchangeRate}`);

    console.log('\n── Rezime konplè ────────────────────────────────────────────');
    console.log(`  VirtualCard.balance: €${currentBalance.toFixed(2)} → €${newCardBalance.toFixed(2)} (+€${INITIAL_DEPOSIT_EUR.toFixed(2)}, depo inisyal gratis ki manke a)`);
    console.log(`  Wallet HTG (${wallet.id}): ${walletBefore} HTG → ${walletAfter} HTG (-${htgCost})`);
    console.log(`  Transaction odit: BSICARDS-EUR-CREATE-DEPOSIT-${CARD_ID} (montan ${htgCost} HTG)`);
    console.log('─────────────────────────────────────────────────────────────');

    if (!confirm) {
      console.log('\n[DRY-RUN] Pa gen okenn ekri BDD. Kouri ak --confirm pou egzekite pou tout bon.');
      return;
    }

    const reference = `BSICARDS-EUR-CREATE-DEPOSIT-${CARD_ID}`;
    const existingTx = await prisma.transaction.findUnique({ where: { reference } });
    if (existingTx) {
      console.error(`✗ Gen deja yon Transaction (${existingTx.id}) ak reference sa a — ARÈTE, pa egzekite ankò.`);
      return;
    }

    console.log('\n[LIVE] Ekri chanjman yo...');
    const result = await prisma.$transaction(async (t) => {
      const updatedWallet = await t.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: htgCost } },
      });

      const updatedCard = await t.virtualCard.update({
        where: { cardId: CARD_ID },
        data: { balance: { increment: INITIAL_DEPOSIT_EUR } },
      });

      const transaction = await t.transaction.create({
        data: {
          reference,
          senderWalletId: wallet.id,
          amount: htgCost,
          fee: 0,
          netAmount: htgCost,
          type: 'CARD',
          status: 'COMPLETED',
          title: 'Depo inisyal kat Mastercard EUR (retwoaktif)',
          description:
            `Depo minimòm €${INITIAL_DEPOSIT_EUR.toFixed(2)} (${htgCost} HTG, to ${exchangeRate}) aplike retwoaktivman pou kat ` +
            `Mastercard EUR BSICards ${CARD_ID} — kreye anvan chanjman biznis sa a te aplike (1 sept 2026).`,
        },
      });

      await t.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          transactionId: transaction.id,
          type: 'DEBIT',
          amount: htgCost,
          balanceBefore: walletBefore,
          balanceAfter: walletAfter,
          description: `Depo inisyal retwoaktif €${INITIAL_DEPOSIT_EUR.toFixed(2)} kat Mastercard EUR (${CARD_ID})`,
        },
      });

      return { updatedWallet, updatedCard, transaction };
    }, { isolationLevel: 'Serializable' });

    console.log(`  ✓ VirtualCard ${result.updatedCard.id} → balance=${result.updatedCard.balance}`);
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
