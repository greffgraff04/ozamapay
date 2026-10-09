/**
 * fix-yoniegranville-dead-strowallet-card.ts
 *
 * 9 okt 2026 — Kat StroWallet yoniegranville@gmail.com (cardId 019f962d-...)
 * konfime "terminated" bò kote StroWallet (lekti dirèk API), men DB nou an
 * toujou di ACTIVE paske webhook virtualcard.transaction.declined.terminated
 * pa janm rive pou kat sa a. Script sa a repwodui kòmpòtman
 * CardTerminationService.finalizeReplacement() (adrès-tcheke, kreye kat
 * ranplasman, imèl+notifikasyon) ak feeDeductedHtg=0 — ZEWO dediksyon wallet,
 * paske webhook ki pa konfigire a se yon pwoblèm nou, pa fòt kliyan an.
 * (Pa rele handleTerminationEvent() piblik la — li toujou eseye chaje
 * TOTAL_FEES_USD+MIN_BALANCE $10.50, ki egzakteman sa n vle evite isit la.)
 *
 * DRY-RUN pa defo. Ajoute --confirm pou egzekite pou vre.
 *
 * Kòmand (nan /backend):
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/fix-yoniegranville-dead-strowallet-card.ts
 *   npx ts-node ... scripts/one-off/fix-yoniegranville-dead-strowallet-card.ts --confirm
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import axios from 'axios';
import { StrowalletModule } from '../../src/strowallet/strowallet.module';
import { AlertCooldownModule } from '../../src/common/alert-cooldown/alert-cooldown.module';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { StrowalletService } from '../../src/strowallet/strowallet.service';
import { MailService } from '../../src/mail/mail.service';
import { PrismaService } from '../../src/prisma/prisma.service';

const EMAIL = 'yoniegranville@gmail.com';
const OLD_CARD_ID = '019f962d-9164-7c93-a95d-0361913cd3ac';
const FREE_CARD_DEPOSIT_USD = 3; // minimòm StroWallet, absòbe pa OZAMAPAY — ZEWO frè kliyan
const MASTER_ID = process.env.OZAMAPAY_MASTER_ID as string;

const CONFIRM = process.argv.includes('--confirm');

@Module({ imports: [PrismaModule, StrowalletModule, AlertCooldownModule] })
class FixModule {}

async function confirmStillTerminated(): Promise<void> {
  const url = 'https://strowallet.com/api/bitvcard/fetch-nfccard-detail/';
  const { data } = await axios.get(url, {
    params: { public_key: process.env.STROWALLET_PUBLIC_KEY, mode: 'live', card_id: OLD_CARD_ID },
  });
  const status = data?.response?.card_detail?.card_status;
  console.log(`[Re-verifikasyon] strowallet.com di card_status="${status}" pou ${OLD_CARD_ID}`);
  if (status !== 'terminated' && status !== 'failed') {
    throw new Error(`Kat la PA "terminated"/"failed" (li "${status}") — ARETE, pa kontinye san revize.`);
  }
}

async function main() {
  await confirmStillTerminated();

  const app = await NestFactory.createApplicationContext(FixModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);
  const strowallet = app.get(StrowalletService);
  const mail = app.get(MailService);

  try {
    const user = await prisma.user.findUnique({
      where: { email: EMAIL },
      include: { wallet: true, kyc: true },
    });
    if (!user) throw new Error('Itilizatè pa jwenn');

    const card = await prisma.virtualCard.findUnique({ where: { cardId: OLD_CARD_ID } });
    if (!card) throw new Error('Kat pa jwenn lokalman');
    if (card.userId !== user.id) throw new Error('Kat sa a pa pou itilizatè sa a — ARETE');
    if (card.status !== 'ACTIVE') throw new Error(`Kat la deja "${card.status}" lokalman, pa "ACTIVE" — tcheke anvan kontinye`);

    const addressTooShort = strowallet.isAddressTooShort(user.kyc?.line1);

    console.log('\n=== PLAN ===');
    console.log(`1. VirtualCard ${OLD_CARD_ID}: status ACTIVE -> TERMINATED (terminatedAt=now, balanceAtTermination=0)`);
    if (addressTooShort) {
      console.log('2. Adrès KYC twò kout detekte — PA kreye kat, voye imèl "korije adrès" olye (zewo frè, KYC rete apwouve).');
    } else {
      console.log(`2. createReplacementCard(userId=${user.id}, fundAmountUsd=${FREE_CARD_DEPOSIT_USD}, oldCardId=${OLD_CARD_ID}, feeDeductedHtg=0)`);
      console.log('   -> okenn dediksyon wallet, nouvo kat StroWallet ak $3 gratis');
      console.log('3. Ansyen kat -> REPLACED (replacedByCardId=nouvo kat la)');
      console.log('4. Imèl sendCardReplaced() + notifikasyon "Kat ou ranplase" bay kliyan an');
    }
    console.log(`5. AdminActionLog: manual remediation, adminId=${MASTER_ID}`);

    if (!CONFIRM) {
      console.log('\n[DRY-RUN] Pa gen chanjman fèt. Ajoute --confirm pou egzekite pou vre.');
      return;
    }

    console.log('\n[CONFIRM] Egzekisyon reyèl...');

    await prisma.virtualCard.update({
      where: { cardId: OLD_CARD_ID },
      data: { status: 'TERMINATED', terminatedAt: new Date(), balanceAtTermination: 0 },
    });
    console.log('[OK] Etap 1 — kat lokal mete TERMINATED.');

    if (addressTooShort) {
      await strowallet.recordAddressBlockAndNotify({
        userId: user.id,
        email: user.email,
        name: user.name || 'OZAMA USER',
        amountUsd: FREE_CARD_DEPOSIT_USD,
        context: 'REPLACEMENT',
        oldCardId: OLD_CARD_ID,
      });
      console.log('[OK] Adrès twò kout — imèl korije-adrès voye, pa gen kat kreye, pa gen frè.');
    } else {
      const newCard = await strowallet.createReplacementCard(user.id, FREE_CARD_DEPOSIT_USD, OLD_CARD_ID, 0);

      if (!('cardId' in newCard)) {
        console.log(`[OK] cardkyc "pending" — background poll (pollPendingCardCreations) ap konplete l otomatikman.`);
      } else {
        await prisma.virtualCard.update({
          where: { cardId: OLD_CARD_ID },
          data: { status: 'REPLACED', replacedByCardId: newCard.id },
        });
        await mail.sendCardReplaced(user.email, user.name ?? 'Kliyan', FREE_CARD_DEPOSIT_USD, undefined).catch((e) => {
          console.error('Email sendCardReplaced echwe (non-bloquant):', e?.message);
        });
        await prisma.notification.create({
          data: {
            userId: user.id,
            title: 'Kat ou ranplase',
            message: `Kat ou ranplase otomatikman, nouvo balans: $${FREE_CARD_DEPOSIT_USD}`,
            type: 'SUCCESS',
          },
        }).catch(() => {});
        console.log('\nNouvo kat:', { cardId: newCard.cardId, balance: newCard.balance.toString(), status: newCard.status });
      }
    }

    await prisma.adminActionLog.create({
      data: {
        adminId: MASTER_ID,
        action: 'STROWALLET_CARD_MANUAL_REMEDIATION',
        targetType: 'VirtualCard',
        details: `Kat ${OLD_CARD_ID} (${EMAIL}) konfime terminated bò StroWallet san webhook rive — mete TERMINATED/REPLACED manyèlman, nouvo kat kreye SAN frè (fundAmountUsd=${FREE_CARD_DEPOSIT_USD}, feeDeductedHtg=0). Rezon: webhook pa konfigire, pa fòt kliyan.`,
      },
    });
    console.log('[OK] AdminActionLog anrejistre.');
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error('ERROR', err?.message ?? err);
  process.exit(1);
});
