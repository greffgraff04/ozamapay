/**
 * restore-naelka-jean-card-after-provider-termination.ts
 *
 * Script one-off pou kliyan naelle435@icloud.com (Naelka Jean). PA reyize pou
 * lòt kliyan san apwobasyon biznis, dat, ak rezon klè.
 *
 * KONTEKS: VirtualCard.id ...fedc4 (cardId founisè 6a7f4b56f613dfbb3d79c39b, créé
 * 2026-08-14) fèmen bò kote StroWallet/ziiropay
 * depi AVAN transisyon ZiiroPay (founisè a dejà ta koupe l la). BDD lokal nou
 * toujou montre status=ACTIVE, ki anpeche createAndFundCard() (verifikasyon
 * "yon sèl kat ACTIVE/FROZEN/PENDING_RECHARGE pa kliyan") — wè
 * strowallet.service.ts:481-484.
 *
 * DESIZYON BIZNIS: se yon KADO total — OZAMAPAY absòbe tout, Naelka pa peye
 * anyen, wallet HTG li (59 HTG) PA touche. Nouvo kat: $3.00 USD premye fon +
 * $2.56 frè founisè reyèl (chif biznis konfime pou ka sa a, pa CARD_CREATION_
 * FEE_USD $2.50 nan strowallet.service.ts:141 — sa a se yon chif dokimantasyon
 * pou Transaction/LedgerEntry/AdminActionLog SÈLMAN, pa gen chanjman nan
 * strowallet.service.ts) = $5.56 total absòbe pa OZAMAPAY.
 *
 * Itilize `createReplacementCard()` (StrowalletService) — MENM fonksyon
 * CardTerminationService.finalizeReplacement() itilize pou ranplasman
 * otomatik — ki PA fè okenn operasyon wallet (pa gen debi). Script la ekri
 * manyèlman Transaction+LedgerEntry $0 pou tras odit (menm apwòch ak script
 * restore-nelson-djempson-card-after-provider-termination.ts).
 *
 * Safety: DRY-RUN pa default — montre plan konplè + apèsi egzak imèl la,
 * AUKENN apèl API StroWallet, AUKENN ekri BDD, AUKENN imèl REYÈL voye.
 * Refize kouri si APP_ENV=staging. Verifye anvan: (1) kat la egziste e li
 * apatyen Naelka Jean, (2) status ACTIVE jan nou atann, (3) email yunik
 * (yon sèl match), (4) wallet balans pa touche pa Transaction/LedgerEntry
 * odit la (amount=0 tout kote). Kòmand ak --confirm FÈ yon vrè apèl
 * create-nfc-card REYÈL bay StroWallet — pa kouri li san otorizasyon klè.
 *
 * Kòmand (nan /backend):
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/restore-naelka-jean-card-after-provider-termination.ts            # dry-run
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/restore-naelka-jean-card-after-provider-termination.ts --confirm  # live
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

@Module({ imports: [PrismaModule, AlertCooldownModule, StrowalletModule] })
class BootstrapModule {}

const CUSTOMER_EMAIL = 'naelle435@icloud.com';
const AMOUNT_USD = 3;
const FEE_DEDUCTED_HTG = 0; // kliyan pa peye anyen — OZAMAPAY absòbe
const PROVIDER_CREATION_FEE_USD = 2.56; // chif biznis konfime pou odit sa a — enfòmasyon sèlman, PA CARD_CREATION_FEE_USD (strowallet.service.ts:141, rete $2.50, pa touche)
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
    // ── 0. Jwenn kliyan an pa imèl, verifye yon sèl match ───────────────────
    const matches = await prisma.user.findMany({
      where: { email: { equals: CUSTOMER_EMAIL, mode: 'insensitive' } },
      include: { wallet: true, virtualCards: true },
    });
    if (matches.length === 0) {
      console.error(`✗ Pa jwenn okenn itilizatè ak email ${CUSTOMER_EMAIL} — ARÈTE`);
      return;
    }
    if (matches.length > 1) {
      console.error(`✗ ${matches.length} itilizatè ak menm email ${CUSTOMER_EMAIL} — pa yunik, ARÈTE, envestige.`);
      return;
    }
    const user = matches[0];

    const activeCards = user.virtualCards.filter((c) => ['ACTIVE', 'FROZEN', 'PENDING_RECHARGE'].includes(c.status));
    if (activeCards.length !== 1) {
      console.error(
        `✗ Kliyan an gen ${activeCards.length} kat ACTIVE/FROZEN/PENDING_RECHARGE (atann egzakteman 1) — ARÈTE, envestige.`,
      );
      console.error(JSON.stringify(activeCards.map((c) => ({ cardId: c.cardId, status: c.status })), null, 2));
      return;
    }
    const card = activeCards[0];
    // "fedc4" se fen VirtualCard.id (kle BDD), PA VirtualCard.cardId (ID founisè a).
    if (!card.id.endsWith('fedc4')) {
      console.error(`✗ Kat ACTIVE la (id=${card.id}, cardId=${card.cardId}) pa matche ak id atann (fini ak fedc4) — ARÈTE, verifye.`);
      return;
    }
    if (!user.wallet) {
      console.error('✗ Kliyan an pa gen wallet — ARÈTE');
      return;
    }

    const walletBalanceBefore = user.wallet.balance;

    console.log('── Kliyan ────────────────────────────────────────────────────');
    console.log(`  ${user.name} (${user.email})`);
    console.log(`  userId: ${user.id}`);
    console.log(`  wallet: ${user.wallet.id} | balans aktyèl: ${walletBalanceBefore} HTG (PA TOUCHE pa operasyon sa a)`);
    console.log(`  Ansyen kat BDD: cardId=${card.cardId} status=${card.status} balans lokal=${card.balance}`);

    console.log('\n── Plan konplè ───────────────────────────────────────────────');
    console.log(`  1. VirtualCard ${card.cardId}:`);
    console.log(`       status: ACTIVE → TERMINATED`);
    console.log(`       balanceAtTermination: ${card.balance}`);
    console.log(`       terminatedAt: ${new Date().toISOString()}`);
    console.log(`       (ranje a PA efase — jis mete ajou)`);
    console.log(`  2. createReplacementCard(userId, fundAmountUsd=$${AMOUNT_USD}, oldCardId, feeDeductedHtg=0)`);
    console.log(`       → apèl REYÈL cardkyc + create-nfc-card bay StroWallet/ziiropay`);
    console.log(`       → kreye nouvo VirtualCard (status=ACTIVE, balance=$${AMOUNT_USD}, currency=USD)`);
    console.log(`       → OKENN operasyon wallet.update (menm jan ak ranplasman otomatik)`);
    console.log(`       → SI founisè a reponn "pending": ansyen kat rete TERMINATED, pa gen REPLACED/`);
    console.log(`         Transaction/email touswit — pollPendingCardCreations() (chak 30s) konplete l pita.`);
    console.log(`  3. (si kreyasyon reisi touswit) Ansyen VirtualCard ${card.cardId}:`);
    console.log(`       status: TERMINATED → REPLACED`);
    console.log(`       replacedByCardId: <id nouvo kat>`);
    console.log(`  4. Transaction (odit, San mouvman lajan — amount=0):`);
    console.log(`       type=CARD status=COMPLETED amount=0 netAmount=0 fee=0`);
    console.log(`       reference=CARD-TERMINATE-RESTORE-${card.cardId}-<timestamp>`);
    console.log(`       description: "$${AMOUNT_USD} USD nouvo kat apre tèminasyon founisè — OZAMAPAY absòbe`);
    console.log(`         $${AMOUNT_USD} prensipal + $${PROVIDER_CREATION_FEE_USD} frè kreyasyon. Wallet HTG kliyan an PA touche."`);
    console.log(`     LedgerEntry (menm Transaction): type=CREDIT amount=0`);
    console.log(`       balanceBefore=balanceAfter=${walletBalanceBefore} HTG`);
    console.log(`  5. AdminActionLog: action=CARD_RESTORED_AFTER_PROVIDER_TERMINATION (tras odit admin)`);
    console.log(`  6. Email sendCardReplaced(${user.email}, "${user.name ?? 'Kliyan'}", $${AMOUNT_USD}, fee=undefined)`);
    console.log(`       → mesaj "ranplase san frè" (branch feeDeductedHtg=0 nan template a) — sèlman si --confirm`);

    console.log('\n── Koute total pou OZAMAPAY ──────────────────────────────────');
    console.log(`  $${AMOUNT_USD.toFixed(2)} (premye fon nouvo kat, pa gen debi wallet kliyan)`);
    console.log(`  + $${PROVIDER_CREATION_FEE_USD.toFixed(2)} (frè kreyasyon StroWallet, ki ta dwe dediwi nan wallet kliyan)`);
    console.log(`  = $${(AMOUNT_USD + PROVIDER_CREATION_FEE_USD).toFixed(2)} total absòbe pa OZAMAPAY`);
    console.log(`  Wallet HTG: ${walletBalanceBefore} HTG → ${walletBalanceBefore} HTG (SAN CHANJMAN)`);

    console.log('\n── Verifikasyon float founisè (read-only) ─────────────────────');
    console.log('  Pa gen okenn wout StroWallet/ziiropay ki retounen yon "float"/balans jeneral kont');
    console.log('  founisè a nan strowalletService la — sèl wout balans ki egziste se PÈ-KAT');
    console.log('  (fetch-nfccard-detail, egzije card_id, se yon vrè apèl API — pa fèt nan dry-run).');
    console.log('  Konklizyon: PA gen fason read-only pou wè float founisè a jodi a.');

    // ── Apèsi egzak tèks imèl la (san voye, san modifye template) ──────────
    // Reproduksyon EGZAK nan konpozisyon sendCardReplaced() (mail.service.ts
    // ~lin 290-316) — itilize menm fonksyon prive yo sou menm enstans
    // MailService la, san janm rele sendCardReplaced() li menm ni this.send()
    // (ki ta fè yon vrè apèl Brevo). Template a pa touche.
    const m = mail as any;
    const now = new Date().toLocaleDateString('fr-HT');
    const previewHtml = m.wrap(
      'Kat vityèl ou ranplase otomatikman',
      'Kat Ranplase',
      m.badge('KONFIME') +
        `<div style="height:16px;"></div>` +
        m.amountBox(`$${AMOUNT_USD.toFixed(2)}`, 'Nouvo balans kat la') +
        m.table(
          m.infoRow('Rezon', 'Kat presedan an te dezaktive/terminen') +
            (FEE_DEDUCTED_HTG ? m.infoRow('Frè dediwi nan wallet ou', `${FEE_DEDUCTED_HTG.toLocaleString('fr-HT')} HTG`) : '') +
            m.infoRow('Dat', now),
        ) +
        m.p(`Bonjou ${user.name ?? 'Kliyan'},`) +
        m.p('Kat vityèl ou a te dezaktive epi nou ranplase l otomatikman pou ou.') +
        m.accentLine('Kat ou pare pou itilize kounye a — verifye l nan app la.') +
        m.btn('Wè Kat Ou →', `${m.frontendUrl}/dashboard`),
    );
    console.log('\n── Apèsi egzak imèl sendCardReplaced (NAN DRY-RUN SA A — PA VOYE) ──');
    console.log(`  To: ${user.email}`);
    console.log(`  Subject: Kat vityèl ou ranplase otomatikman`);
    console.log('  HTML:');
    console.log(previewHtml);
    console.log(`  → Mansyone non founisè (StroWallet/ziiropay)? ${/strowallet|ziiropay/i.test(previewHtml) ? 'OUI — PWOBLÈM' : 'NON — OK'}`);

    console.log('\n─────────────────────────────────────────────────────────────');

    if (!confirm) {
      console.log('\n[DRY-RUN] Pa gen okenn apèl StroWallet, ekri BDD, ni imèl REYÈL voye. Kouri ak --confirm pou egzekite pou tout bon.');
      return;
    }

    if (!MASTER_ID) {
      console.error('\n✗ OZAMAPAY_MASTER_ID pa defini nan .env — ARÈTE anvan nenpòt ekri BDD.');
      process.exitCode = 1;
      return;
    }

    // ── LIVE: Etap 1 — mete ansyen kat TERMINATED ────────────────────────────
    console.log('\n[LIVE] Etap 1 — mete ansyen kat TERMINATED nan BDD...');
    await prisma.virtualCard.update({
      where: { cardId: card.cardId },
      data: { status: 'TERMINATED', balanceAtTermination: card.balance, terminatedAt: new Date() },
    });
    console.log('  ✓ Fèt.');

    // ── LIVE: Etap 2 — kreye ranplasman (apèl REYÈL StroWallet) ──────────────
    console.log(`\n[LIVE] Etap 2 — createReplacementCard($${AMOUNT_USD}) — apèl REYÈL bay StroWallet...`);
    let result: Awaited<ReturnType<typeof svc.createReplacementCard>>;
    try {
      result = await svc.createReplacementCard(user.id, AMOUNT_USD, card.cardId, FEE_DEDUCTED_HTG);
    } catch (err: any) {
      console.error(`  ✗✗✗ ECHWE — ${err?.strowalletDetail ?? err?.message}`);
      console.error('  Ansyen kat rete TERMINATED (kòrèk, se vrè eta li). Ranplasman PA kreye —');
      console.error('  retante script sa a pita, oswa envestige rezon echèk la anvan.');
      throw err;
    }

    // 5 nov 2026 — BUG konfime AN LIVE (job-dbmfnq3m8hqs73fbltdg): `'status' in
    // result` fo, paske VirtualCard (rezilta siksè a) OSI gen yon chan `status`
    // (ex: "ACTIVE") — kondisyon an te toujou vrè, kit se siksè kit se pending,
    // ki te fè script la sispann apre Etap 2 san janm flip REPLACED/kreye
    // odit/voye imèl menm lè kreyasyon an te reisi. Sèl chan "PENDING_VERIFICATION"
    // diskriminan — li pa yon valè CardStatus posib (ACTIVE/FROZEN/TERMINATED/
    // REPLACED/PENDING_RECHARGE), kidonk konparezon egzak la san ambigwite.
    if (result.status === 'PENDING_VERIFICATION') {
      console.log(`  → "${result.status}" — cardkyc founisè a reponn "pending" (eta tranzitwa, pa echèk).`);
      console.log('  Ansyen kat rete TERMINATED. Background poll (pollPendingCardCreations, chak 30s)');
      console.log('  ap konplete kreyasyon an otomatikman lè cardkyc rezoud.');
      console.log('\n[LIVE] Fini (pou kounye a) — ap kontinye an background.');
      return;
    }

    const newCard = result;
    console.log(`  ✓✓✓ SIKSÈ — nouvo cardId=${newCard.cardId}`);

    // ── LIVE: Etap 3 — flip ansyen kat REPLACED ──────────────────────────────
    console.log('\n[LIVE] Etap 3 — flip ansyen kat REPLACED...');
    await prisma.virtualCard.update({
      where: { cardId: card.cardId },
      data: { status: 'REPLACED', replacedByCardId: newCard.id },
    });
    console.log('  ✓ Fèt.');

    // ── LIVE: Etap 4+5 — Transaction + LedgerEntry odit, AdminActionLog ──────
    console.log('\n[LIVE] Etap 4/5 — Transaction + LedgerEntry odit + AdminActionLog...');
    const reference = `CARD-TERMINATE-RESTORE-${card.cardId}-${Date.now()}`;
    const description =
      `$${AMOUNT_USD} USD nouvo kat (${newCard.cardId}) apre tèminasyon founisè kat ${card.cardId} — ` +
      `OZAMAPAY absòbe $${AMOUNT_USD} prensipal + $${PROVIDER_CREATION_FEE_USD} frè kreyasyon. ` +
      `Wallet HTG kliyan an PA touche.`;

    await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          reference,
          senderWalletId: user.wallet!.id,
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
          walletId: user.wallet!.id,
          transactionId: transaction.id,
          type: 'CREDIT',
          amount: 0,
          balanceBefore: user.wallet!.balance,
          balanceAfter: user.wallet!.balance,
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
    await mail.sendCardReplaced(user.email, user.name ?? 'Kliyan', AMOUNT_USD, undefined).catch((err: any) => {
      console.error(`  ✗ Email echwe (pa kritik, pa anile operasyon): ${err?.message}`);
    });
    console.log('  ✓ Email voye (oswa echèk log pi wo a, san anile rès operasyon an).');

    const walletAfter = await prisma.wallet.findUnique({ where: { userId: user.id } });
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
