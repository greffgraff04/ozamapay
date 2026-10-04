/**
 * retry-create-card-oliviergreffin20-after-body-fix.ts
 *
 * Script one-off pou kliyan oliviergreffin20@gmail.com (4 oct 2026), apre 2
 * fix deplwaye nan menm commit la (ca10ca5):
 *   1. id_front_image kounye a ale nan body requête POST la (nfcPost()),
 *      pa nan URL/query string — bug ki te lakòz 414 "Request-URI Too Large".
 *   2. ID_FRONT_IMAGE_BASE64_THRESHOLD monte 8,000 -> 1,200,000 karaktè (vrè
 *      limit StroWallet konfime a se ~1MB), rezoud resize/kalite 800px/85%
 *      olye 240px/30% — pou evite rejè Sumsub "DATANOTREADABLE" ki te lakòz
 *      pa yon imaj twò konprese san rezon.
 *
 * Kont sa a gen 2 kat StroWallet TERMINATED deja (pa gen ACTIVE/FROZEN/
 * PENDING_RECHARGE), KYC APPROVED, balans wallet sifizan — verifye ak
 * _recheck-oliviergreffin20-eligibility.ts anvan egzekisyon sa a.
 *
 * Safety: DRY-RUN pa default. Kouri ak --confirm pou egzekite pou tout bon
 * (sa a FÈ yon vrè apèl cardkyc/create-nfc-card bay StroWallet EPI debite
 * wallet HTG kliyan an pou $3, ranbouse otomatikman si li echwe).
 *
 * Kòmand (nan /backend):
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/retry-create-card-oliviergreffin20-after-body-fix.ts            # dry-run
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/retry-create-card-oliviergreffin20-after-body-fix.ts --confirm  # live
 */

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { StrowalletModule } from '../../src/strowallet/strowallet.module';
import { StrowalletService } from '../../src/strowallet/strowallet.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { AlertCooldownModule } from '../../src/common/alert-cooldown/alert-cooldown.module';

// StrowalletService depann sou AlertCooldownService (ajoute apre
// retry-create-card-rudolph.ts te ekri) — li pa fè pati StrowalletModule,
// kidonk bezwen yon ti module bootstrap ki enpòte tou de, menm jan ak
// cardkyc-full-flow-live-test-greffin.ts.
@Module({ imports: [PrismaModule, AlertCooldownModule, StrowalletModule] })
class RetryBootstrapModule {}

const CUSTOMER_EMAIL = 'oliviergreffin20@gmail.com';
const AMOUNT_USD = 3;

async function main() {
  const confirm = process.argv.includes('--confirm');

  const app = await NestFactory.createApplicationContext(RetryBootstrapModule, { logger: ['error', 'warn', 'log'] });
  const prisma = app.get(PrismaService);
  const svc = app.get(StrowalletService);

  try {
    const user = await prisma.user.findFirst({ where: { email: CUSTOMER_EMAIL }, include: { wallet: true, kyc: true } });
    if (!user) {
      console.error(`✗ Pa jwenn itilizatè ak email ${CUSTOMER_EMAIL} — ARÈTE`);
      return;
    }
    if (!user.wallet) {
      console.error('✗ Itilizatè a pa gen wallet — ARÈTE');
      return;
    }
    if (user.kyc?.status !== 'APPROVED') {
      console.error(`✗ KYC pa APPROVED (status="${user.kyc?.status}") — ARÈTE`);
      return;
    }
    const existing = await prisma.virtualCard.findFirst({
      where: { userId: user.id, provider: 'STROWALLET_NFC', status: { in: ['ACTIVE', 'FROZEN', 'PENDING_RECHARGE'] } },
    });
    if (existing) {
      console.error(`✗ Kliyan an gen deja yon kat StroWallet status=${existing.status} (${existing.cardId}) — ARÈTE.`);
      return;
    }

    const exchangeRate = await svc.getExchangeRate();
    const totalHtg = Math.ceil(AMOUNT_USD * exchangeRate);

    console.log('── Kliyan ────────────────────────────────────────────────');
    console.log(`  ${user.name} (${user.email})`);
    console.log(`  wallet: ${user.wallet.id} | balans aktyèl: ${user.wallet.balance} HTG`);
    console.log(`  KYC: ${user.kyc.status}`);
    console.log(`  Kou echanj: ${exchangeRate} HTG/USD → koute total: ${totalHtg} HTG pou $${AMOUNT_USD}`);

    if (Number(user.wallet.balance) < totalHtg) {
      console.error(`✗ Balans ennsifizan (${user.wallet.balance} HTG < ${totalHtg} HTG) — ARÈTE.`);
      return;
    }
    console.log('  ✓ Balans sifizan, pa gen kat StroWallet ACTIVE/FROZEN/PENDING_RECHARGE — OK pou eseye');

    console.log('\n── Plan ─────────────────────────────────────────────────');
    console.log(`  createAndFundCard(userId, $${AMOUNT_USD}) — apèl cardkyc + create-nfc-card REYÈL bay StroWallet (ak fix body/limit 4 oct 2026)`);
    console.log(`  Wallet debite ${totalHtg} HTG anvan apèl la; ranbouse OTOMATIKMAN si StroWallet echwe`);
    console.log('─────────────────────────────────────────────────────────────');

    if (!confirm) {
      console.log('\n[DRY-RUN] Pa gen okenn apèl StroWallet ni ekri BDD ni debi wallet. Kouri ak --confirm pou egzekite pou tout bon.');
      return;
    }

    console.log('\n[LIVE] Rele createAndFundCard($3) — apèl REYÈL bay StroWallet...\n');
    try {
      const result = await svc.createAndFundCard(user.id, AMOUNT_USD);
      console.log('✓✓✓ SIKSÈ ✓✓✓');
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
