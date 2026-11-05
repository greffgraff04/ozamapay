/**
 * finish-naelka-jean-replacement-audit-and-email.ts
 *
 * Script KOREKTIF one-off pou kliyan naelle435@icloud.com (Naelka Jean). PA
 * reyize pou lòt kliyan san apwobasyon biznis, dat, ak rezon klè.
 *
 * KONTEKS: job-dbmfnq3m8hqs73fbltdg (5 nov 2026, 21:58 UTC) te kouri
 * restore-naelka-jean-card-after-provider-termination.ts --confirm sou prod.
 * Apèl founisè a (cardkyc + create-nfc-card) REISI — nouvo VirtualCard
 * (cardId 01a1adb8-b2ef-728b-81fe-68435eff99b3, ACTIVE, USD, $3) te kreye
 * tout bon. Men yon BUG nan script sa a (`'status' in result` — VirtualCard
 * siksè a OSI gen yon chan `status`, kidonk kondisyon an te toujou vrè) te
 * fè l sispann touswit apre kreyasyon an, san janm:
 *   1. Flip ansyen VirtualCard (cardId 6a7f4b56f613dfbb3d79c39b) REPLACED
 *   2. Kreye Transaction+LedgerEntry (odit, amount=0) + AdminActionLog
 *   3. Voye imèl sendCardReplaced bay kliyan an
 * Script sa a FINI SÈLMAN etap ki manke yo. OKENN apèl StroWallet/ZiiroPay,
 * OKENN nouvo kat kreye — kat la deja egziste e li ACTIVE (verifye anvan).
 *
 * Idanpotans: chak ekriti verifye si li deja fèt anvan li ekri — kouri script
 * sa a plizyè fwa san danje (2yèm kouri a pa fè anyen si tout deja fèt).
 *
 * Safety: DRY-RUN pa default — montre plan konplè + apèsi egzak imèl la,
 * AUKENN apèl StroWallet, AUKENN ekri BDD, AUKENN imèl REYÈL voye. Refize
 * kouri si APP_ENV=staging. Verifye anvan: (1) ansyen kat egziste e li
 * apatyen Naelka Jean, (2) nouvo kat egziste E li ACTIVE (si non, ARÈTE —
 * pa gen sans fè odit pou yon kat ki pa la), (3) chak ekriti (flip/odit)
 * idanpotan.
 *
 * Kòmand (nan /backend):
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/finish-naelka-jean-replacement-audit-and-email.ts            # dry-run
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/finish-naelka-jean-replacement-audit-and-email.ts --confirm  # live
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { MailService } from '../../src/mail/mail.service';
import { MailModule } from '../../src/mail/mail.module';
import { isStaging } from '../../src/config/app-env';

@Module({ imports: [PrismaModule, MailModule] })
class BootstrapModule {}

const CUSTOMER_EMAIL = 'naelle435@icloud.com';
const OLD_CARD_ID = '6a7f4b56f613dfbb3d79c39b'; // VirtualCard.cardId (ansyen)
const NEW_CARD_PROVIDER_ID = '01a1adb8-b2ef-728b-81fe-68435eff99b3'; // VirtualCard.cardId (nouvo, founisè)
const AMOUNT_USD = 3;
const PROVIDER_CREATION_FEE_USD = 2.56; // chif biznis konfime — menm ak script orijinal la
const TXN_REFERENCE = `CARD-TERMINATE-RESTORE-${OLD_CARD_ID}`; // prefix, timestamp ajoute lè kreye
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
    if (!user.wallet) {
      console.error('✗ Kliyan an pa gen wallet — ARÈTE');
      return;
    }

    const oldCard = user.virtualCards.find((c) => c.cardId === OLD_CARD_ID);
    const newCard = user.virtualCards.find((c) => c.cardId === NEW_CARD_PROVIDER_ID);

    if (!oldCard) {
      console.error(`✗ Pa jwenn ansyen VirtualCard cardId=${OLD_CARD_ID} pou kliyan sa a — ARÈTE`);
      return;
    }
    if (!newCard) {
      console.error(`✗ Pa jwenn nouvo VirtualCard cardId=${NEW_CARD_PROVIDER_ID} pou kliyan sa a — ARÈTE (okenn kat pa kreye).`);
      return;
    }
    if (newCard.status !== 'ACTIVE') {
      console.error(`✗ Nouvo kat la gen status="${newCard.status}" (atann ACTIVE) — ARÈTE, envestige anvan fè odit.`);
      return;
    }

    const walletBalance = user.wallet.balance;

    // ── Idanpotans: tcheke sa ki DEJA fèt anvan nou planifye okenn ekriti ───
    const flipAlreadyDone = oldCard.status === 'REPLACED' && oldCard.replacedByCardId === newCard.id;
    const existingTxn = await prisma.transaction.findFirst({
      where: { reference: { startsWith: TXN_REFERENCE } },
    });
    const auditAlreadyDone = !!existingTxn;
    const existingAdminLog = await prisma.adminActionLog.findFirst({
      where: { action: 'CARD_RESTORED_AFTER_PROVIDER_TERMINATION', targetId: newCard.id },
    });

    console.log('── Kliyan ────────────────────────────────────────────────────');
    console.log(`  ${user.name} (${user.email})`);
    console.log(`  userId: ${user.id}`);
    console.log(`  wallet: ${user.wallet.id} | balans aktyèl: ${walletBalance} HTG (PA TOUCHE pa operasyon sa a)`);
    console.log(`  Ansyen kat: cardId=${oldCard.cardId} status=${oldCard.status} replacedByCardId=${oldCard.replacedByCardId ?? 'null'}`);
    console.log(`  Nouvo kat:  cardId=${newCard.cardId} status=${newCard.status} balans=${newCard.balance} ${newCard.currency}`);

    console.log('\n── Eta idanpotans (anvan nenpòt ekriti) ────────────────────────');
    console.log(`  Flip ansyen kat → REPLACED: ${flipAlreadyDone ? 'DEJA FÈT — SKIP' : 'MANKE — AP FÈT'}`);
    console.log(`  Transaction+LedgerEntry odit: ${auditAlreadyDone ? `DEJA FÈT (${existingTxn!.reference}) — SKIP` : 'MANKE — AP FÈT'}`);
    console.log(`  AdminActionLog: ${existingAdminLog ? 'DEJA FÈT — SKIP' : 'MANKE — AP FÈT (menm transaksyon ak Transaction/Ledger)'}`);

    const emailWillSend = confirm && !auditAlreadyDone;

    console.log('\n── Plan konplè ───────────────────────────────────────────────');
    if (flipAlreadyDone && auditAlreadyDone) {
      console.log('  Tout bagay deja fèt — script sa a pa gen anyen pou l fè (idanpotan).');
    } else {
      if (!flipAlreadyDone) {
        console.log(`  1. VirtualCard ${oldCard.cardId}: status TERMINATED → REPLACED, replacedByCardId=${newCard.id} (ID entèn VirtualCard, pa cardId founisè — konvansyon konfime pa card-termination.service.ts:224)`);
      }
      if (!auditAlreadyDone) {
        console.log(`  2. Transaction (odit, amount=0): reference=${TXN_REFERENCE}-<timestamp>`);
        console.log(`       description: "$${AMOUNT_USD} USD nouvo kat (${newCard.cardId}) apre tèminasyon founisè kat ${oldCard.cardId} —`);
        console.log(`         OZAMAPAY absòbe $${AMOUNT_USD} prensipal + $${PROVIDER_CREATION_FEE_USD} frè kreyasyon. Wallet HTG kliyan an PA touche."`);
        console.log(`     LedgerEntry (menm Transaction): type=CREDIT amount=0 balanceBefore=balanceAfter=${walletBalance} HTG`);
        console.log(`  3. AdminActionLog: action=CARD_RESTORED_AFTER_PROVIDER_TERMINATION, targetId=${newCard.id}`);
      }
      console.log(`  4. Email sendCardReplaced(${user.email}, "${user.name ?? 'Kliyan'}", $${AMOUNT_USD}, fee=undefined) — sèlman si --confirm`);
      console.log(`       ${auditAlreadyDone ? '(SKIP — odit deja egziste, pa voye 2yèm imèl pou evite doublon)' : '(AP VOYE si --confirm)'}`);
    }

    console.log('\n── Koute total pou OZAMAPAY (enfòmasyon, pa yon nouvo ekriti) ──');
    console.log(`  $${AMOUNT_USD.toFixed(2)} + $${PROVIDER_CREATION_FEE_USD.toFixed(2)} = $${(AMOUNT_USD + PROVIDER_CREATION_FEE_USD).toFixed(2)} total absòbe pa OZAMAPAY`);
    console.log(`  Wallet HTG: ${walletBalance} HTG → ${walletBalance} HTG (SAN CHANJMAN, okenn operasyon wallet nan script sa a)`);

    // ── Apèsi egzak tèks imèl la (san voye, san modifye template) ──────────
    const m = mail as any;
    const now = new Date().toLocaleDateString('fr-HT');
    const previewHtml = m.wrap(
      'Kat vityèl ou ranplase otomatikman',
      'Kat Ranplase',
      m.badge('KONFIME') +
        `<div style="height:16px;"></div>` +
        m.amountBox(`$${AMOUNT_USD.toFixed(2)}`, 'Nouvo balans kat la') +
        m.table(m.infoRow('Rezon', 'Kat presedan an te dezaktive/terminen') + m.infoRow('Dat', now)) +
        m.p(`Bonjou ${user.name ?? 'Kliyan'},`) +
        m.p('Kat vityèl ou a te dezaktive epi nou ranplase l otomatikman pou ou.') +
        m.accentLine('Kat ou pare pou itilize kounye a — verifye l nan app la.') +
        m.btn('Wè Kat Ou →', `${m.frontendUrl}/dashboard`),
    );
    console.log('\n── Apèsi egzak imèl sendCardReplaced (DRY-RUN — PA VOYE) ──');
    console.log(`  To: ${user.email}`);
    console.log(`  Subject: Kat vityèl ou ranplase otomatikman`);
    console.log('  HTML:');
    console.log(previewHtml);
    console.log(`  → Mansyone non founisè (StroWallet/ziiropay)? ${/strowallet|ziiropay/i.test(previewHtml) ? 'OUI — PWOBLÈM' : 'NON — OK'}`);
    console.log(`  → Imèl sa a ap voye pou tout bon si --confirm: ${emailWillSend ? 'WI' : 'NON (odit deja egziste oswa dry-run)'}`);

    console.log('\n─────────────────────────────────────────────────────────────');

    if (!confirm) {
      console.log('\n[DRY-RUN] Pa gen okenn apèl StroWallet, ekri BDD, ni imèl REYÈL voye. Kouri ak --confirm pou egzekite pou tout bon.');
      return;
    }

    if (flipAlreadyDone && auditAlreadyDone) {
      console.log('\n[LIVE] Tout bagay deja fèt (idanpotan) — pa gen anyen pou egzekite. Fini.');
      return;
    }

    if (!auditAlreadyDone && !MASTER_ID) {
      console.error('\n✗ OZAMAPAY_MASTER_ID pa defini nan .env — ARÈTE anvan nenpòt ekri BDD.');
      process.exitCode = 1;
      return;
    }

    const reference = `${TXN_REFERENCE}-${Date.now()}`;
    const description =
      `$${AMOUNT_USD} USD nouvo kat (${newCard.cardId}) apre tèminasyon founisè kat ${oldCard.cardId} — ` +
      `OZAMAPAY absòbe $${AMOUNT_USD} prensipal + $${PROVIDER_CREATION_FEE_USD} frè kreyasyon. ` +
      `Wallet HTG kliyan an PA touche. (Ekri apre koreksyon bug 'status' in result, job-dbmfnq3m8hqs73fbltdg.)`;

    console.log('\n[LIVE] Ekri BDD nan yon transaksyon (flip + odit)...');
    await prisma.$transaction(async (tx) => {
      if (!flipAlreadyDone) {
        await tx.virtualCard.update({
          where: { cardId: oldCard.cardId },
          data: { status: 'REPLACED', replacedByCardId: newCard.id },
        });
        console.log('  ✓ Ansyen kat flip REPLACED.');
      }
      if (!auditAlreadyDone) {
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
        console.log(`  ✓ Transaction ${reference} + LedgerEntry + AdminActionLog kreye.`);
      }
    });

    if (emailWillSend) {
      console.log('\n[LIVE] Email sendCardReplaced (san frè)...');
      await mail.sendCardReplaced(user.email, user.name ?? 'Kliyan', AMOUNT_USD, undefined).catch((err: any) => {
        console.error(`  ✗ Email echwe (pa kritik, pa anile operasyon): ${err?.message}`);
      });
      console.log('  ✓ Email voye (oswa echèk log pi wo a, san anile rès operasyon an).');
    } else {
      console.log('\n[LIVE] Email PA voye (odit te deja egziste anvan kouri sa a — evite doublon).');
    }

    const walletAfter = await prisma.wallet.findUnique({ where: { userId: user.id } });
    console.log(`\n✓ Wallet balans verifye san chanjman: ${walletAfter?.balance} HTG (te ${walletBalance} HTG)`);
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
