/**
 * fix-dob-and-create-card.ts
 *
 * Itilize pa admin lè yon kliyan reponn imèl/WhatsApp ak vrè dat nesans li
 * (apre cardkyc rejte ak "Customer must be at least 18 years old" poutèt
 * yon move dat placeholder/erè nan dosye KYC). Mete Kyc.dateOfBirth ajou
 * epi relanse createAndFundCard($3) otomatikman — menm apwòch ak
 * apply-corrected-address.ts, men pou chan dateOfBirth (pa gen
 * CardCreationAddressBlock pou relanse otomatikman nan ka sa a, paske
 * echèk orijinal la pa t pou rezon adrès).
 *
 * Safety: DRY-RUN pa default. --confirm pou aplike pou tout bon.
 *
 * Kòmand (kòm Render job pou bon sekrè production):
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/fix-dob-and-create-card.ts --email=xxx@gmail.com --dateOfBirth=1998-03-05            # dry-run
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
class FixDobBootstrapModule {}

const AMOUNT_USD = 3;

function getArgValue(flag: string): string | null {
  const arg = process.argv.find((a) => a.startsWith(`${flag}=`));
  return arg ? arg.slice(flag.length + 1) : null;
}

async function main() {
  const email = getArgValue('--email');
  const dobInput = getArgValue('--dateOfBirth');
  const confirm = process.argv.includes('--confirm');
  if (!email || !dobInput) {
    console.error('✗ Mande --email=<email> --dateOfBirth=<YYYY-MM-DD>');
    process.exitCode = 1;
    return;
  }
  const newDob = new Date(dobInput);
  if (isNaN(newDob.getTime())) {
    console.error(`✗ --dateOfBirth="${dobInput}" pa yon dat valid (mande fòma YYYY-MM-DD)`);
    process.exitCode = 1;
    return;
  }

  const app = await NestFactory.createApplicationContext(FixDobBootstrapModule, { logger: ['error', 'warn', 'log'] });
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
    console.log(`  Dat nesans aktyèl: ${user.kyc.dateOfBirth.toISOString().slice(0, 10)} → nouvo: ${newDob.toISOString().slice(0, 10)}`);
    console.log(`  wallet: balans aktyèl: ${user.wallet.balance} HTG`);
    console.log(`  Kou echanj: ${exchangeRate} HTG/USD → koute total: ${totalHtg} HTG pou $${AMOUNT_USD}`);

    const ageYears = (Date.now() - newDob.getTime()) / (365.25 * 24 * 3600 * 1000);
    console.log(`  Laj kalkile ak nouvo dat la: ~${ageYears.toFixed(1)} an`);
    if (ageYears < 18) {
      console.error('✗ Nouvo dat la fè kliyan an gen mwens pase 18 an — ARÈTE (ap rejte kanmenm).');
      return;
    }
    if (Number(user.wallet.balance) < totalHtg) {
      console.error(`✗ Balans ennsifizan (${user.wallet.balance} HTG < ${totalHtg} HTG) — ARÈTE.`);
      return;
    }
    console.log('  ✓ Elijib pou relanse kreyasyon kat la apre koreksyon dat nesans');

    if (!confirm) {
      console.log('\n[DRY-RUN] Pa gen okenn chanjman DB ni apèl StroWallet. Kouri ak --confirm pou aplike pou tout bon.');
      return;
    }

    console.log('\n[LIVE] Mete dat nesans ajou...');
    await prisma.kyc.update({ where: { userId: user.id }, data: { dateOfBirth: newDob } });
    console.log('✓ Dat nesans mete ajou.');

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
