/**
 * final-sanity-create-card.ts
 *
 * Dènye tès konfimasyon apre deplwaman fix "cardkyc pending" (4 oct 2026,
 * commit 06bb2bc) — egzekite createAndFundCard() REYÈL konplè (cardkyc +
 * create-nfc-card, $3) pou yon kont KYC APPROVED ki poko gen okenn istwa
 * StroWallet, pou konfime flow la toujou fonksyone apre deplwaman.
 *
 * Safety: DRY-RUN pa default. --confirm pou egzekite pou tout bon.
 *
 * Kòmand (via Render job pou bon sekrè production):
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/final-sanity-create-card.ts --email=xxx@gmail.com            # dry-run
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/final-sanity-create-card.ts --email=xxx@gmail.com --confirm  # live
 */

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { StrowalletModule } from '../../src/strowallet/strowallet.module';
import { StrowalletService } from '../../src/strowallet/strowallet.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { AlertCooldownModule } from '../../src/common/alert-cooldown/alert-cooldown.module';

@Module({ imports: [PrismaModule, AlertCooldownModule, StrowalletModule] })
class FinalSanityBootstrapModule {}

const AMOUNT_USD = 3;

function getArgValue(flag: string): string | null {
  const arg = process.argv.find((a) => a.startsWith(`${flag}=`));
  return arg ? arg.slice(flag.length + 1) : null;
}

async function main() {
  const email = getArgValue('--email');
  const confirm = process.argv.includes('--confirm');
  if (!email) {
    console.error('✗ Mande --email=<email>');
    process.exitCode = 1;
    return;
  }

  const app = await NestFactory.createApplicationContext(FinalSanityBootstrapModule, { logger: ['error', 'warn', 'log'] });
  const prisma = app.get(PrismaService);
  const svc = app.get(StrowalletService);

  try {
    const user = await prisma.user.findFirst({ where: { email }, include: { wallet: true, kyc: true } });
    if (!user) { console.error(`✗ Pa jwenn itilizatè ak email ${email} — ARÈTE`); return; }
    if (!user.wallet) { console.error('✗ Pa gen wallet — ARÈTE'); return; }
    if (user.kyc?.status !== 'APPROVED') { console.error(`✗ KYC pa APPROVED (status="${user.kyc?.status}") — ARÈTE`); return; }
    const existing = await prisma.virtualCard.findFirst({ where: { userId: user.id, provider: 'STROWALLET_NFC', status: { in: ['ACTIVE', 'FROZEN', 'PENDING_RECHARGE'] } } });
    if (existing) { console.error(`✗ Kliyan an gen deja yon kat status=${existing.status} — ARÈTE.`); return; }

    const exchangeRate = await svc.getExchangeRate();
    const totalHtg = Math.ceil(AMOUNT_USD * exchangeRate);

    console.log('── Kliyan ────────────────────────────────────────────────');
    console.log(`  ${user.name} (${user.email})`);
    console.log(`  wallet: balans aktyèl: ${user.wallet.balance} HTG`);
    console.log(`  Kou echanj: ${exchangeRate} HTG/USD → koute total: ${totalHtg} HTG pou $${AMOUNT_USD}`);
    if (Number(user.wallet.balance) < totalHtg) { console.error(`✗ Balans ennsifizan — ARÈTE.`); return; }
    console.log('  ✓ OK pou eseye');

    if (!confirm) {
      console.log('\n[DRY-RUN] Pa gen okenn apèl StroWallet. Kouri ak --confirm pou egzekite pou tout bon.');
      return;
    }

    console.log('\n[LIVE] Rele createAndFundCard($3) — apèl REYÈL bay StroWallet (fix 06bb2bc)...\n');
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
