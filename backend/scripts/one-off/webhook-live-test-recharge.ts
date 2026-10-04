/**
 * webhook-live-test-recharge.ts
 *
 * Tès diagnostik aktif (4 oct 2026) pou konfime si webhook StroWallet/
 * ziiropay reyèlman kraze oswa se jis pa gen evènman ki rive. Deklannche
 * yon rechaj $3 (minimòm valid — pa gen opsyon $1, wè fundVirtualCard())
 * sou kont pwòp Mr. Greffin (oliviergreffin20@gmail.com, AUKENN kliyan
 * reyèl pa touche), epi imedyatman apre, admin tcheke `render logs` pou
 * wè si yon webhook rive nan 60 segond.
 *
 * Konnen deja (kòmantè egzistan nan fundVirtualCard()): ziiropay.com pa
 * konfime voye "topup.complete" — ZiiropayCorrelationService ranplase sa
 * ak yon pol 15 min. Tès sa a verifye sa anpirikman JODI A.
 *
 * Safety: DRY-RUN pa default. --confirm pou egzekite pou tout bon.
 *
 * Kòmand (kòm Render job):
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/webhook-live-test-recharge.ts            # dry-run
 *   ... --confirm  # live
 */

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { StrowalletModule } from '../../src/strowallet/strowallet.module';
import { StrowalletService } from '../../src/strowallet/strowallet.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { AlertCooldownModule } from '../../src/common/alert-cooldown/alert-cooldown.module';

@Module({ imports: [PrismaModule, AlertCooldownModule, StrowalletModule] })
class WebhookTestBootstrapModule {}

const TEST_EMAIL = 'oliviergreffin20@gmail.com';
const AMOUNT_USD = 3;

async function main() {
  const confirm = process.argv.includes('--confirm');

  const app = await NestFactory.createApplicationContext(WebhookTestBootstrapModule, { logger: ['error', 'warn', 'log'] });
  const prisma = app.get(PrismaService);
  const svc = app.get(StrowalletService);

  try {
    const user = await prisma.user.findFirst({ where: { email: TEST_EMAIL }, include: { wallet: true } });
    if (!user) { console.error(`✗ Pa jwenn ${TEST_EMAIL} — ARÈTE`); return; }

    console.log(`── Kont tès: ${TEST_EMAIL} (pa yon kliyan reyèl — kont Mr. Greffin) ──`);
    console.log(`  Wallet aktyèl: ${user.wallet?.balance} HTG`);
    console.log(`  Plan: fundVirtualCard($${AMOUNT_USD}) — deklannche fund-withdraw-nfccard sou ziiropay.com`);

    if (!confirm) {
      console.log('\n[DRY-RUN] Pa gen okenn apèl StroWallet. Kouri ak --confirm pou egzekite pou tout bon.');
      return;
    }

    const t0 = new Date();
    console.log(`\n[LIVE] ${t0.toISOString()} — Rele fundVirtualCard($${AMOUNT_USD})...\n`);
    try {
      const result = await svc.fundVirtualCard(user.id, AMOUNT_USD);
      const t1 = new Date();
      console.log(`✓✓✓ REPONS (${t1.toISOString()}, ${t1.getTime() - t0.getTime()}ms) ✓✓✓`);
      console.log(JSON.stringify(result, null, 2));
    } catch (err: any) {
      console.log('✗✗✗ ECHWE ✗✗✗');
      console.log('Mesaj:', err?.message);
      console.log('Detay:', err?.strowalletDetail ?? '(pa gen)');
      throw err;
    }
    console.log(`\nMARKÈ TÈS: tcheke render logs apati ${t0.toISOString()} pou 90s apati kounye a.`);
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
