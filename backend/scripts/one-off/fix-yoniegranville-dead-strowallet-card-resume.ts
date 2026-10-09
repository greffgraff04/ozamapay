/**
 * fix-yoniegranville-dead-strowallet-card-resume.ts
 *
 * 9 okt 2026 — Repran apre echèk: etap 1 (mete ansyen kat TERMINATED) te
 * deja reyisi (lanse lokalman kont DB pwodiksyon an), men etap 2 (kreye kat
 * ranplasman) te echwe lokalman paske ZIIROPAY_PUBLIC_KEY sèlman egziste
 * nan anviwonman Render a. Script sa a fèt pou kouri SOU Render (render
 * jobs create), kote sekrè a disponib. Li verifye kat la deja TERMINATED
 * (pa touche l ankò), epi fè sèlman etap 2-5 (kreye ranplasman SAN frè,
 * imèl+notifikasyon, AdminActionLog).
 *
 * DRY-RUN pa defo. Ajoute --confirm pou egzekite pou vre.
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { StrowalletModule } from '../../src/strowallet/strowallet.module';
import { AlertCooldownModule } from '../../src/common/alert-cooldown/alert-cooldown.module';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { StrowalletService } from '../../src/strowallet/strowallet.service';
import { MailService } from '../../src/mail/mail.service';
import { PrismaService } from '../../src/prisma/prisma.service';

const EMAIL = 'yoniegranville@gmail.com';
const OLD_CARD_ID = '019f962d-9164-7c93-a95d-0361913cd3ac';
const FREE_CARD_DEPOSIT_USD = 3;
const MASTER_ID = process.env.OZAMAPAY_MASTER_ID as string;

const CONFIRM = process.argv.includes('--confirm');

@Module({ imports: [PrismaModule, StrowalletModule, AlertCooldownModule] })
class FixModule {}

async function main() {
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

    const existingReplacement = await prisma.virtualCard.findFirst({
      where: { userId: user.id, provider: 'STROWALLET_NFC', status: 'ACTIVE', cardId: { not: OLD_CARD_ID } },
    });
    if (existingReplacement) {
      console.log('[STOP] Gen DEJA yon kat StroWallet ACTIVE ki pa ansyen an:', existingReplacement.cardId, '— pa fè anyen (evite doub kreyasyon).');
      return;
    }

    const card = await prisma.virtualCard.findUnique({ where: { cardId: OLD_CARD_ID } });
    if (!card) throw new Error('Kat ansyen an pa jwenn lokalman');
    if (card.status !== 'TERMINATED') {
      throw new Error(`Atann status TERMINATED, jwenn "${card.status}" — ARETE, revize anvan kontinye.`);
    }

    const addressTooShort = strowallet.isAddressTooShort(user.kyc?.line1);

    console.log('\n=== PLAN (repran) ===');
    console.log(`Ansyen kat ${OLD_CARD_ID} deja TERMINATED (konfime).`);
    if (addressTooShort) {
      console.log('Adrès KYC twò kout — PA kreye kat, voye imèl "korije adrès" olye.');
    } else {
      console.log(`createReplacementCard(userId=${user.id}, fundAmountUsd=${FREE_CARD_DEPOSIT_USD}, oldCardId=${OLD_CARD_ID}, feeDeductedHtg=0)`);
      console.log('-> nouvo kat StroWallet ak $3 gratis, ansyen kat -> REPLACED, imèl+notifikasyon.');
    }

    if (!CONFIRM) {
      console.log('\n[DRY-RUN] Pa gen chanjman fèt. Ajoute --confirm pou egzekite pou vre.');
      return;
    }

    console.log('\n[CONFIRM] Egzekisyon reyèl...');

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
        console.log('[OK] cardkyc "pending" — background poll (pollPendingCardCreations) ap konplete l otomatikman.');
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
        details: `Kat ${OLD_CARD_ID} (${EMAIL}) konfime terminated bò StroWallet san webhook rive — TERMINATED/REPLACED manyèlman, nouvo kat kreye SAN frè (fundAmountUsd=${FREE_CARD_DEPOSIT_USD}, feeDeductedHtg=0). Script repran apre echèk lokal (manke ZIIROPAY_PUBLIC_KEY lokalman), kouri sou Render.`,
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
