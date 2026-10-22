/**
 * restore-nelson-djempson-card-after-provider-termination.ts
 *
 * Script one-off pou kliyan nelsondjempson@gmail.com. PA reyize pou lòt
 * kliyan san apwobasyon biznis, dat, ak rezon klè.
 *
 * KONTEKS: cardId 01a12d1b-16aa-7c75-97fe-ae1080497f81 fèmen otomatikman
 * bò kote StroWallet/ziiropay apre 4 refi (konfime pa Mr. Greffin, 21 okt
 * 2026, ~01:03). Founisè a retounen $49.00 nan balans OZAMAPAY — PA nan
 * balans kliyan an. BDD lokal nou toujou montre status=ACTIVE (webhook
 * `virtualcard.transaction.declined.terminated` ki ta dwe trete sa a mouri
 * depi plizyè semèn — wè dyagnostik 21 okt).
 *
 * DESIZYON BIZNIS: OZAMAPAY absòbe tout — Nelson resevwa yon nouvo kat ak
 * $49 ladan, ZEWO debi sou wallet HTG li, ZEWO frè kreyasyon. Koute total
 * pou nou: $49.00 (prensipal, deja pèdi bay founisè a — nou peye l ankò nan
 * pòch nou pou Nelson) + $2.50 (frè kreyasyon StroWallet, CARD_CREATION_FEE_USD
 * nan card-termination.service.ts, ki ta dwe dediwi nan wallet kliyan an
 * nòmalman — isit li absòbe) = $51.50 total.
 *
 * Itilize `createReplacementCard()` (StrowalletService) — MENM fonksyon
 * CardTerminationService.finalizeReplacement() itilize pou ranplasman
 * otomatik — ki PA fè okenn operasyon wallet (pa gen debi). Script la ekri
 * manyèlman Transaction+LedgerEntry $0 pou tras odit (menm apwòch ak
 * BSICardsBalanceSyncService.syncAllBalances() ak CARD-TERMINATE-REVERT-*
 * pou oliviergreffin20) — pa gen mouvman lajan reyèl nan wallet HTG,
 * sèlman yon tras ki dokimante ki jan $49 USD la restore.
 *
 * Safety: DRY-RUN pa default — montre plan konplè, AUKENN apèl API
 * StroWallet, AUKENN ekri BDD, AUKENN imèl. Refize kouri si APP_ENV=staging
 * (script sa a se yon korije PWODIKSYON egzat pou YON kont — pa gen sans
 * ni done pou li nan staging). Verifye anvan: (1) kat la egziste e li
 * apatyen Nelson, (2) status ACTIVE jan nou atann (pa deja trete), (3)
 * wallet balans pa touche pa Transaction/LedgerEntry odit la (amount=0
 * tout kote). Kòmand ak --confirm FÈ yon vrè apèl create-nfc-card REYÈL bay
 * StroWallet — pa kouri li san otorizasyon klè.
 *
 * Kòmand (nan /backend):
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/restore-nelson-djempson-card-after-provider-termination.ts            # dry-run
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/restore-nelson-djempson-card-after-provider-termination.ts --confirm  # live
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { StrowalletModule } from '../../src/strowallet/strowallet.module';
import { StrowalletService } from '../../src/strowallet/strowallet.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { MailService } from '../../src/mail/mail.service';
import { AlertCooldownModule } from '../../src/common/alert-cooldown/alert-cooldown.module';
import { isStaging } from '../../src/config/app-env';

// StrowalletService depann sou AlertCooldownService (@Global, men pa enpòte
// otomatikman si StrowalletModule bootstrap poukont li) — menm fix ak
// notify-address-too-short-batch.ts.
@Module({ imports: [PrismaModule, AlertCooldownModule, StrowalletModule] })
class BootstrapModule {}

const CUSTOMER_EMAIL = 'nelsondjempson@gmail.com';
const OLD_CARD_ID = '01a12d1b-16aa-7c75-97fe-ae1080497f81';
const AMOUNT_USD = 49;
const FEE_DEDUCTED_HTG = 0; // kliyan pa peye anyen — OZAMAPAY absòbe
const PROVIDER_CREATION_FEE_USD = 2.5; // CARD_CREATION_FEE_USD, card-termination.service.ts — enfòmasyon sèlman
const MASTER_ID = process.env.OZAMAPAY_MASTER_ID as string;

async function main() {
  if (isStaging()) {
    console.error('✗ APP_ENV=staging — script sa a se yon korije pwodiksyon espesifik, pa gen sans nan staging. ARÈTE.');
    process.exitCode = 1;
    return;
  }

  const confirm = process.argv.includes('--confirm');

  const app = await NestFactory.createApplicationContext(BootstrapModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);
  const svc = app.get(StrowalletService);
  const mail = app.get(MailService);

  try {
    // ── 1. Jwenn kat la + kliyan an ──────────────────────────────────────────
    const card = await prisma.virtualCard.findUnique({
      where: { cardId: OLD_CARD_ID },
      include: { user: { include: { wallet: true } } },
    });
    if (!card) {
      console.error(`✗ Pa jwenn VirtualCard ak cardId ${OLD_CARD_ID} — ARÈTE`);
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
    if (!card.user.wallet) {
      console.error('✗ Kliyan an pa gen wallet — ARÈTE');
      return;
    }

    const walletBalanceBefore = card.user.wallet.balance;

    console.log('── Kliyan ────────────────────────────────────────────────────');
    console.log(`  ${card.user.name} (${card.user.email})`);
    console.log(`  userId: ${card.userId}`);
    console.log(`  wallet: ${card.user.wallet.id} | balans aktyèl: ${walletBalanceBefore} HTG`);
    console.log(`  Ansyen kat BDD: cardId=${card.cardId} status=${card.status} balans lokal=${card.balance}`);

    console.log('\n── Plan konplè ───────────────────────────────────────────────');
    console.log(`  1. VirtualCard ${card.cardId}:`);
    console.log(`       status: ACTIVE → TERMINATED`);
    console.log(`       balanceAtTermination: ${AMOUNT_USD}`);
    console.log(`       terminatedAt: ${new Date().toISOString()}`);
    console.log(`       (ranje a PA efase — jis mete ajou)`);
    console.log(`  2. createReplacementCard(userId, fundAmountUsd=$${AMOUNT_USD}, oldCardId, feeDeductedHtg=0)`);
    console.log(`       → apèl REYÈL cardkyc + create-nfc-card bay StroWallet/ziiropay`);
    console.log(`       → kreye nouvo VirtualCard (status=ACTIVE, balance=$${AMOUNT_USD}, currency=USD)`);
    console.log(`       → OKENN operasyon wallet.update (menm jan ak ranplasman otomatik)`);
    console.log(`       → SI founisè a reponn "pending" (eta tranzitwa): ansyen kat rete TERMINATED,`);
    console.log(`         pa gen REPLACED/Transaction/email touswit — background poll ki deja egziste`);
    console.log(`         (pollPendingCardCreations, chak 30s) ap konplete l otomatikman pita.`);
    console.log(`  3. (si kreyasyon reisi touswit) Ansyen VirtualCard ${card.cardId}:`);
    console.log(`       status: TERMINATED → REPLACED`);
    console.log(`       replacedByCardId: <id nouvo kat>`);
    console.log(`  4. Transaction (odit, San mouvman lajan — amount=0):`);
    console.log(`       type=CARD status=COMPLETED amount=0 netAmount=0 fee=0`);
    console.log(`       reference=CARD-TERMINATE-RESTORE-${OLD_CARD_ID}-<timestamp>`);
    console.log(`       description: "$${AMOUNT_USD} USD restore sou nouvo kat apre tèminasyon`);
    console.log(`         otomatik (4 refi) — founisè a te retounen lajan an nan balans OZAMAPAY`);
    console.log(`         olye balans kliyan an. OZAMAPAY absòbe $${AMOUNT_USD} prensipal`);
    console.log(`         + $${PROVIDER_CREATION_FEE_USD} frè kreyasyon. Wallet HTG kliyan an PA touche."`);
    console.log(`     LedgerEntry (menm Transaction): type=CREDIT amount=0`);
    console.log(`       balanceBefore=balanceAfter=${walletBalanceBefore} HTG`);
    console.log(`  5. AdminActionLog: action=CARD_RESTORED_AFTER_PROVIDER_TERMINATION (tras odit admin)`);
    console.log(`  6. Email sendCardReplaced(${card.user.email}, "${card.user.name ?? 'Kliyan'}", $${AMOUNT_USD}, fee=undefined)`);
    console.log(`       → mesaj "ranplase san frè" (branch feeDeductedHtg=0 nan template a)`);

    console.log('\n── Koute total pou OZAMAPAY ──────────────────────────────────');
    console.log(`  $${AMOUNT_USD.toFixed(2)} (prensipal, deja pèdi bay founisè a — repeye pou Nelson)`);
    console.log(`  + $${PROVIDER_CREATION_FEE_USD.toFixed(2)} (frè kreyasyon StroWallet, ki ta dwe dediwi nan wallet kliyan)`);
    console.log(`  = $${(AMOUNT_USD + PROVIDER_CREATION_FEE_USD).toFixed(2)} total absòbe pa OZAMAPAY`);
    console.log(`  Wallet HTG Nelson: ${walletBalanceBefore} HTG → ${walletBalanceBefore} HTG (SAN CHANJMAN, verifye apre si --confirm)`);
    console.log('─────────────────────────────────────────────────────────────');

    if (!confirm) {
      console.log('\n[DRY-RUN] Pa gen okenn apèl StroWallet, ekri BDD, ni imèl. Kouri ak --confirm pou egzekite pou tout bon.');
      return;
    }

    if (!MASTER_ID) {
      console.error('\n✗ OZAMAPAY_MASTER_ID pa defini nan .env — ARÈTE anvan nenpòt ekri BDD.');
      process.exitCode = 1;
      return;
    }

    // ── LIVE: Etap 1 — mete ansyen kat TERMINATED (vrè eta l deja, founisè konfime) ──
    console.log('\n[LIVE] Etap 1 — mete ansyen kat TERMINATED nan BDD...');
    await prisma.virtualCard.update({
      where: { cardId: OLD_CARD_ID },
      data: { status: 'TERMINATED', balanceAtTermination: AMOUNT_USD, terminatedAt: new Date() },
    });
    console.log('  ✓ Fèt.');

    // ── LIVE: Etap 2 — kreye ranplasman (apèl REYÈL StroWallet) ──────────────
    console.log('\n[LIVE] Etap 2 — createReplacementCard($49) — apèl REYÈL bay StroWallet...');
    let result: Awaited<ReturnType<typeof svc.createReplacementCard>>;
    try {
      result = await svc.createReplacementCard(card.userId, AMOUNT_USD, OLD_CARD_ID, FEE_DEDUCTED_HTG);
    } catch (err: any) {
      console.error(`  ✗✗✗ ECHWE — ${err?.strowalletDetail ?? err?.message}`);
      console.error('  Ansyen kat rete TERMINATED (kòrèk, se vrè eta li). Ranplasman PA kreye —');
      console.error('  retante script sa a pita, oswa envestige rezon echèk la anvan.');
      throw err;
    }

    if ('status' in result) {
      console.log(`  → "${result.status}" — cardkyc founisè a reponn "pending" (eta tranzitwa, pa echèk).`);
      console.log('  Ansyen kat rete TERMINATED. Background poll (pollPendingCardCreations, chak 30s)');
      console.log('  ap konplete kreyasyon an otomatikman lè cardkyc rezoud — l ap flip REPLACED + voye');
      console.log('  email + Transaction/LedgerEntry odit LAN MENM FÈT otomatikman nan chemen sa a.');
      console.log('\n[LIVE] Fini (pou kounye a) — ap kontinye an background.');
      return;
    }

    const newCard = result;
    console.log(`  ✓✓✓ SIKSÈ — nouvo cardId=${newCard.cardId}`);

    // ── LIVE: Etap 3 — flip ansyen kat REPLACED ──────────────────────────────
    console.log('\n[LIVE] Etap 3 — flip ansyen kat REPLACED...');
    await prisma.virtualCard.update({
      where: { cardId: OLD_CARD_ID },
      data: { status: 'REPLACED', replacedByCardId: newCard.id },
    });
    console.log('  ✓ Fèt.');

    // ── LIVE: Etap 4+5 — Transaction + LedgerEntry odit, AdminActionLog ──────
    console.log('\n[LIVE] Etap 4/5 — Transaction + LedgerEntry odit + AdminActionLog...');
    const reference = `CARD-TERMINATE-RESTORE-${OLD_CARD_ID}-${Date.now()}`;
    const description =
      `$${AMOUNT_USD} USD restore sou nouvo kat (${newCard.cardId}) apre tèminasyon otomatik ` +
      `(4 refi) kat ${OLD_CARD_ID} — founisè a te retounen lajan an nan balans OZAMAPAY olye balans ` +
      `kliyan an. OZAMAPAY absòbe $${AMOUNT_USD} prensipal + $${PROVIDER_CREATION_FEE_USD} frè kreyasyon. ` +
      `Wallet HTG kliyan an PA touche.`;

    await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          reference,
          senderWalletId: card.user.wallet!.id,
          amount: 0,
          fee: 0,
          netAmount: 0,
          type: 'CARD',
          status: 'COMPLETED',
          title: 'Kat restore apre tèminasyon founisè',
          description,
        },
      });
      await tx.ledgerEntry.create({
        data: {
          walletId: card.user.wallet!.id,
          transactionId: transaction.id,
          type: 'CREDIT',
          amount: 0,
          balanceBefore: card.user.wallet!.balance,
          balanceAfter: card.user.wallet!.balance,
          description,
        },
      });
      await tx.adminActionLog.create({
        data: {
          adminId: MASTER_ID,
          action: 'CARD_RESTORED_AFTER_PROVIDER_TERMINATION',
          targetType: 'VirtualCard',
          targetId: newCard.id,
          details: description,
        },
      });
    });
    console.log(`  ✓ Transaction ${reference} + LedgerEntry + AdminActionLog kreye.`);

    // ── LIVE: Etap 6 — Email ─────────────────────────────────────────────────
    console.log('\n[LIVE] Etap 6 — email sendCardReplaced (san frè)...');
    await mail.sendCardReplaced(card.user.email, card.user.name ?? 'Kliyan', AMOUNT_USD, undefined).catch((err: any) => {
      console.error(`  ✗ Email echwe (pa kritik, pa anile operasyon): ${err?.message}`);
    });
    console.log('  ✓ Email voye (oswa echèk log pi wo a, san anile rès operasyon an).');

    const walletAfter = await prisma.wallet.findUnique({ where: { userId: card.userId } });
    console.log(`\n✓ Wallet balans verifye san chanjman: ${walletAfter?.balance} HTG (te ${walletBalanceBefore} HTG)`);
    console.log('[LIVE] Fini.');
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
