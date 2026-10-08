/**
 * relaunch-rimsky-card-after-city-fix.ts
 *
 * Demand Mr. Greffin, 8 oct 2026 — Rimsky Pierre-Toussaint (trimsky@gmail.com,
 * city="Delmas 71") te eseye kreye yon kat NFC 5 fwa (7-8 oktòb), tout rejte pa
 * cardkyc ak "City can contain only letters, hyphens, apostrophes, periods, and
 * spaces". Chak tantativ te otomatikman ranbouse (wallet li entak, 862.52 HTG).
 * Apre fix StrowalletService.sanitizeCityForProvider(), relanse $3 — menm
 * montan ak dènye tantativ li.
 *
 * Safety: DRY-RUN pa default — montre city/line1 ki pral voye bay founisè a
 * (kalkile ak VRÈ sanitizeCityForProvider() enjekte, pa yon kopi), balans,
 * elijiblite. OKENN debi/apèl API. --confirm pou relanse pou tout bon.
 *
 * Kòmand:
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/relaunch-rimsky-card-after-city-fix.ts            # dry-run
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
class RelaunchBootstrapModule {}

const EMAIL = 'trimsky@gmail.com';
const AMOUNT_USD = 3;

async function main() {
  const confirm = process.argv.includes('--confirm');

  const app = await NestFactory.createApplicationContext(RelaunchBootstrapModule, { logger: ['error', 'warn', 'log'] });
  const prisma = app.get(PrismaService);
  const svc = app.get(StrowalletService);

  try {
    const user = await prisma.user.findFirst({ where: { email: EMAIL }, include: { wallet: true, kyc: true } });
    if (!user) { console.error(`✗ Pa jwenn itilizatè ak email ${EMAIL} — ARÈTE`); return; }
    if (!user.wallet) { console.error('✗ Pa gen wallet — ARÈTE'); return; }
    if (!user.kyc) { console.error('✗ Pa gen KYC — ARÈTE'); return; }
    if (user.kyc.status !== 'APPROVED') { console.error(`✗ KYC pa APPROVED (status="${user.kyc.status}") — ARÈTE`); return; }

    const existing = await prisma.virtualCard.findFirst({
      where: { userId: user.id, provider: 'STROWALLET_NFC', status: { in: ['ACTIVE', 'FROZEN', 'PENDING_RECHARGE'] } },
    });
    if (existing) { console.error(`✗ Kliyan an gen deja yon kat status=${existing.status} — ARÈTE.`); return; }

    const exchangeRate = await svc.getExchangeRate();
    const totalHtg = Math.ceil(AMOUNT_USD * exchangeRate);
    const { city: providerCity, line1: providerLine1 } = svc.sanitizeCityForProvider(user.kyc.city, user.kyc.line1);

    console.log('── Kliyan ────────────────────────────────────────────────');
    console.log(`  ${user.name} (${user.email})`);
    console.log(`  Kyc.city (DB, pa touche): "${user.kyc.city}"`);
    console.log(`  Kyc.line1 (DB, pa touche): "${user.kyc.line1}"`);
    console.log(`  → city voye bay founisè a: "${providerCity}"`);
    console.log(`  → line1 voye bay founisè a: "${providerLine1}" (${providerLine1.length} car.)`);
    console.log(`  wallet: balans aktyèl: ${user.wallet.balance} HTG`);
    console.log(`  Kou echanj: ${exchangeRate} HTG/USD → koute total: ${totalHtg} HTG pou $${AMOUNT_USD}`);

    if (Number(user.wallet.balance) < totalHtg) {
      console.error(`✗ Balans ennsifizan (${user.wallet.balance} HTG < ${totalHtg} HTG) — ARÈTE.`);
      return;
    }
    console.log('  ✓ Elijib pou relanse kreyasyon kat la apre fix city la');

    if (!confirm) {
      console.log('\n[DRY-RUN] Pa gen okenn debi, apèl StroWallet, ni chanjman DB. Kouri ak --confirm pou relanse pou tout bon.');
      return;
    }

    console.log('\n[LIVE] Relanse createAndFundCard($3)...\n');
    try {
      const result = await svc.createAndFundCard(user.id, AMOUNT_USD);
      console.log('✓✓✓ REPONS ✓✓✓');
      console.log(JSON.stringify(result, null, 2));
    } catch (err: any) {
      console.log('✗✗✗ ECHWE ✗✗✗');
      console.log('Mesaj kliyan (jenerik):', err?.message);
      console.log('Detay StroWallet brit (admin-sèlman):', err?.strowalletDetail ?? '(pa gen)');
      throw err;
    }

    const walletAfter = await prisma.wallet.findUnique({ where: { userId: user.id } });
    console.log(`\n✓ Wallet balans apre: ${walletAfter?.balance} HTG`);
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
