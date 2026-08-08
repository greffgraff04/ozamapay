/**
 * manual-credit-usdt-wrong-address-ruldolph.ts
 *
 * Script one-off, egzekite yon sèl fwa (8 out 2026) pou kliyan
 * ruldolph2004@gmail.com. PA reyize pou lòt kliyan san apwobasyon biznis,
 * dat, ak rezon klè.
 *
 * KONTEKS: Kliyan an voye yon depo USDT (TRC20) soti Binance ki rive
 * konfime on-chain (5000+ konfimasyon, SUCCESS) sou adrès
 * TBVM2M4UgjF4aWfseHVDuW1ZTKc7dTTWbi — men adrès sa a PA yon
 * DepositAddress ki egziste nan tab nou an (verifye: 1145 ranje, okenn
 * match egzat/insensitif/patyèl). `TronMonitorService` sèlman siveye
 * adrès ki nan tab `DepositAddress`, donk li te fizikman enposib pou l
 * detekte oswa kredite depo sa a — pa gen okenn echèk API/silans, se yon
 * absans total nan lis siveyans lan.
 *
 * TxID kliyan an te bay la gen 65 karaktè (erè tape/lekti kapòt ekran —
 * yon "5" doub). Vrè TxID (64 car., konfime dirèkteman sou TronGrid,
 * blockNumber 85177271, SUCCESS) se:
 *   6e5e353ec9e143cdaa6204d66ef8891397951527585de1d3de09bccda9900be9
 * Montan on-chain egzat resevwa: 26.066613 USDT (26066613 / 10^6) — sa
 * matche PAFETMAN ak 27.566613 (montan Binance montre) - 1.5 (frè rezo) =
 * 26.066613.
 *
 * FRÈ: Verifye kòd `TronMonitorService.creditDeposit()` (backend/src/
 * tron/tron-monitor.service.ts) — depo USDT otomatik yo kredite ak
 * `fee: 0`, AUKENN dediksyon 6% (sa se yon lòt frè, itilize pou top-up
 * HTG/ajan nan wallet.service.ts FEES.TOPUP, PA pou USDT/crypto). Script
 * sa a swiv EGZAKTEMAN menm lojik la: amountHTG = round(amountUsdt * rate
 * * 100) / 100, fee: 0, netAmount: amountHTG.
 *
 * ONE-OFF script. Kredite wallet HTG kliyan an dirèkteman (San pase pa
 * CryptoDeposit/DepositAddress — pa gen youn ki egziste pou tranzaksyon
 * sa a), kreye yon antre Transaction ki make kle kòm konpansasyon manyèl,
 * epi voye yon imel konfimasyon senp (reyitilize sendTopupConfirmed()
 * egzistan an — menm tanplè ak yon depo HTG nòmal).
 *
 * Safety: DRY-RUN pa default (verifye itilizatè a, montre dekonpozisyon
 * montan konplè, AUKENN ekri BDD, AUKENN imèl). Kouri ak --confirm pou
 * egzekite pou tout bon. Verifye tou pa gen deja yon Transaction ak menm
 * TxID nan description (anpeche double-kredite si script la kouri de fwa).
 *
 * Kòmand (nan /backend):
 *   npx ts-node --transpile-only scripts/one-off/manual-credit-usdt-wrong-address-ruldolph.ts            # dry-run
 *   npx ts-node --transpile-only scripts/one-off/manual-credit-usdt-wrong-address-ruldolph.ts --confirm  # live
 */

import { NestFactory } from '@nestjs/core';
import { v4 as uuidv4 } from 'uuid';
import { StrowalletModule } from '../../src/strowallet/strowallet.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { MailService } from '../../src/mail/mail.service';

const CUSTOMER_EMAIL = 'ruldolph2004@gmail.com';
const AMOUNT_USDT_NET = 26.066613; // on-chain, verifye TronGrid — frè rezo Binance (1.5 USDT) deja retire
const TX_HASH = '6e5e353ec9e143cdaa6204d66ef8891397951527585de1d3de09bccda9900be9';
const WRONG_ADDRESS = 'TBVM2M4UgjF4aWfseHVDuW1ZTKc7dTTWbi';
const NARRATIVE = `Konpansasyon manyèl — depo USDT voye via opsyon 'manyèl' Finans (adrès Trust Wallet pèsonèl CEO), pa flux DepositAddress otomatik. TxID: ${TX_HASH}`;

async function main() {
  const confirm = process.argv.includes('--confirm');

  const app = await NestFactory.createApplicationContext(StrowalletModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);
  const mailService = app.get(MailService);

  try {
    // ── 1. Jwenn kliyan an ────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { email: CUSTOMER_EMAIL },
      include: { wallet: true, depositAddress: true },
    });

    if (!user) {
      console.error(`✗ Pa jwenn itilizatè ak email ${CUSTOMER_EMAIL}`);
      return;
    }
    if (!user.wallet) {
      console.error(`✗ Itilizatè ${CUSTOMER_EMAIL} pa gen wallet — ARÈTE`);
      return;
    }

    console.log('── Kliyan ────────────────────────────────────────────────');
    console.log(`  userId:  ${user.id}`);
    console.log(`  non:     ${user.name}`);
    console.log(`  email:   ${user.email}`);
    console.log(`  wallet:  ${user.wallet.id} | balans aktyèl: ${user.wallet.balance} HTG`);
    console.log(`  adrès depo REYÈL li nan OZAMAPAY: ${user.depositAddress?.address ?? 'AUKENN'}`);
    console.log(`  adrès kote lajan an rive (move): ${WRONG_ADDRESS}`);
    if (user.depositAddress?.address === WRONG_ADDRESS) {
      console.error('  ⚠️  ATANSYON: adrès la MATCHE ak adrès depo REYÈL kliyan an — sa ta vle di li PA move adrès, envestigasyon anvan an te gen yon erè. ARÈTE, verifye ankò.');
      return;
    }

    // ── 2. Anpeche double-kredite si script la kouri de fwa ────────────────
    const existing = await prisma.transaction.findFirst({
      where: { description: { contains: TX_HASH } },
    });
    if (existing) {
      console.error(`✗ Gen deja yon Transaction (${existing.reference}) ak menm TxID nan description — ARÈTE, pa kredite ankò.`);
      return;
    }

    // ── 3. Frè + konvèsyon — swiv EGZAKTEMAN TronMonitorService.creditDeposit() ─
    const rateEntry = await prisma.rate.findUnique({ where: { key: 'USDT_HTG' } });
    const rate = Number(rateEntry?.value || 140);
    const amountHTG = Math.round(AMOUNT_USDT_NET * rate * 100) / 100;

    console.log('── Dekonpozisyon montan ─────────────────────────────────────');
    console.log(`  Montan brit Binance (anvan frè rezo):  27.566613 USDT`);
    console.log(`  Frè rezo Binance (deja retire):        -1.500000 USDT`);
    console.log(`  = Montan net rive on-chain:              ${AMOUNT_USDT_NET.toFixed(6)} USDT`);
    console.log(`  Frè depo OZAMAPAY aplike:               0% (menm lojik ak TronMonitorService.creditDeposit — fee: 0)`);
    console.log(`  Rate.USDT_HTG aktyèl:                    ${rate} HTG/USDT`);
    console.log(`  = Montan HTG final a kredite:            ${amountHTG.toLocaleString('fr-HT')} HTG`);
    console.log('─────────────────────────────────────────────────────────────');

    const reference = `USDT-MANUAL-${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;

    console.log('── Aksyon planifye ─────────────────────────────────────────');
    console.log(`  1. wallet.update: balance += ${amountHTG} HTG (wallet ${user.wallet.id})`);
    console.log(`  2. Transaction.create: reference=${reference}, type=TOPUP, status=COMPLETED, fee=0, method="USDT-TRC20-MANUAL"`);
    console.log(`     description="${NARRATIVE}"`);
    console.log(`  3. sendTopupConfirmed(${user.email}, "${user.name}", ${amountHTG}, "USDT (TRC20)")`);
    console.log('─────────────────────────────────────────────────────────────');

    if (!confirm) {
      console.log('\n[DRY-RUN] Pa gen okenn ekri BDD ni imèl ki voye. Kouri ak --confirm pou egzekite pou tout bon.');
      return;
    }

    console.log('\n[LIVE] Kredite wallet la kounye a...');
    const [, transaction] = await prisma.$transaction([
      prisma.wallet.update({
        where: { id: user.wallet.id },
        data: { balance: { increment: amountHTG } },
      }),
      prisma.transaction.create({
        data: {
          reference,
          receiverWalletId: user.wallet.id,
          amount: amountHTG,
          fee: 0,
          netAmount: amountHTG,
          type: 'TOPUP',
          status: 'COMPLETED',
          method: 'USDT-TRC20-MANUAL',
          title: `Depot USDT (TRC20) — ${AMOUNT_USDT_NET} USDT (${amountHTG} HTG)`,
          description: NARRATIVE,
        },
      }),
    ]);
    console.log(`  ✓ Wallet kredite +${amountHTG} HTG`);
    console.log(`  ✓ Transaction kreye: ${transaction.id} (${transaction.reference})`);

    await mailService.sendTopupConfirmed(user.email, user.name ?? 'Kliyan', amountHTG, 'USDT (TRC20)');
    console.log('  ✓ Imel konfimasyon voye');

    console.log('\n[LIVE] Fini.');
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
