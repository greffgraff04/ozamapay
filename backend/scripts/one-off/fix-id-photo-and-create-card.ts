/**
 * fix-id-photo-and-create-card.ts
 *
 * Itilize pa admin lè yon kliyan reponn imèl/WhatsApp ak yon foto pyès
 * idantite PI KLÈ (apre cardkyc rejte ak "UNSATISFACTORY_PHOTOS" — dokiman
 * an pa t ka li klèman). Mete Kyc.idImage ajou (idNumber/idType rete
 * ENCHAJE — dokiman nouvo a dwe matche done ki deja nan dosye a) epi
 * relanse createAndFundCard($3) otomatikman — menm apwòch ak
 * fix-dob-and-create-card.ts, men pou chan idImage.
 *
 * Safety: DRY-RUN pa default. --confirm pou aplike pou tout bon.
 *
 * Kòmand (kòm Render job pou bon sekrè production):
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/fix-id-photo-and-create-card.ts --email=xxx@gmail.com --idImageUrl=https://...            # dry-run
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
class FixIdPhotoBootstrapModule {}

const AMOUNT_USD = 3;

function getArgValue(flag: string): string | null {
  const arg = process.argv.find((a) => a.startsWith(`${flag}=`));
  return arg ? arg.slice(flag.length + 1) : null;
}

async function main() {
  const email = getArgValue('--email');
  const newIdImageUrl = getArgValue('--idImageUrl');
  const confirm = process.argv.includes('--confirm');
  if (!email || !newIdImageUrl) {
    console.error('✗ Mande --email=<email> --idImageUrl=<url>');
    process.exitCode = 1;
    return;
  }

  const app = await NestFactory.createApplicationContext(FixIdPhotoBootstrapModule, { logger: ['error', 'warn', 'log'] });
  const prisma = app.get(PrismaService);
  const svc = app.get(StrowalletService);

  try {
    const user = await prisma.user.findFirst({ where: { email }, include: { wallet: true, kyc: true } });
    if (!user) { console.error(`✗ Pa jwenn itilizatè ak email ${email} — ARÈTE`); return; }
    if (!user.wallet) { console.error('✗ Pa gen wallet — ARÈTE'); return; }
    if (!user.kyc) { console.error('✗ Pa gen KYC — ARÈTE'); return; }
    if (user.kyc.status !== 'APPROVED') { console.error(`✗ KYC pa APPROVED (status="${user.kyc.status}") — ARÈTE`); return; }

    const existing = await prisma.virtualCard.findFirst({
      where: { userId: user.id, provider: 'STROWALLET_NFC', status: { in: ['ACTIVE', 'FROZEN', 'PENDING_RECHARGE'] } },
    });
    if (existing) { console.error(`✗ Kliyan an gen deja yon kat status=${existing.status} — ARÈTE.`); return; }

    const exchangeRate = await svc.getExchangeRate();
    const totalHtg = Math.ceil(AMOUNT_USD * exchangeRate);

    console.log('── Kliyan ────────────────────────────────────────────────');
    console.log(`  ${user.name} (${user.email})`);
    console.log(`  idType="${user.kyc.idType}" idNumber="${user.kyc.idNumber}" (PA CHANJE)`);
    console.log(`  idImage aktyèl: ${user.kyc.idImage}`);
    console.log(`  idImage nouvo : ${newIdImageUrl}`);
    console.log(`  wallet: balans aktyèl: ${user.wallet.balance} HTG`);
    console.log(`  Kou echanj: ${exchangeRate} HTG/USD → koute total: ${totalHtg} HTG pou $${AMOUNT_USD}`);

    if (Number(user.wallet.balance) < totalHtg) {
      console.error(`✗ Balans ennsifizan (${user.wallet.balance} HTG < ${totalHtg} HTG) — ARÈTE.`);
      return;
    }
    console.log('  ✓ Elijib pou relanse kreyasyon kat la apre chanje foto ID a');

    if (!confirm) {
      console.log('\n[DRY-RUN] Pa gen okenn chanjman DB ni apèl StroWallet. Kouri ak --confirm pou aplike pou tout bon.');
      return;
    }

    console.log('\n[LIVE] Mete idImage ajou (idNumber/idType rete menm jan)...');
    await prisma.kyc.update({
      where: { userId: user.id },
      data: { idImage: newIdImageUrl },
    });
    console.log('✓ idImage mete ajou.');

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
