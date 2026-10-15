/**
 * Rechaj manyèl kat StroWallet VISA Elisabeth ak TOUT balans wallet li ki
 * disponib — otorizasyon kliyan 15 okt 2026. Kalkil ak chemen idantik ak
 * StrowalletService.fundVirtualCard() (menm konstant frè/to, menm apèl
 * nfcPost) — script la rele svc.fundVirtualCard() dirèkteman, pa yon
 * reimplementasyon separe. Sèl diferans: (1) montan an se pi gwo $ antye
 * balans lan pèmèt, kalkile an dirèk; (2) deskripsyon Transaction la
 * ranplase apre siksè; (3) si echwe, mesaj brit founisè a sove nan
 * CardCreationFailure (context=RECHARGE_MANUAL) — gap idantifye 15 okt 2026
 * kote echèk rechaj pa t janm kenbe trase rezon an.
 *
 * DRY-RUN pa default — pa gen apèl founisè, pa gen ekri BDD.
 * Kòmand (nan /backend):
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' \
 *     scripts/one-off/_manual-recharge-elisabeth-full-balance.ts [--confirm]
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { StrowalletService } from '../../src/strowallet/strowallet.service';
import { PrismaService } from '../../src/prisma/prisma.service';

const EMAIL = 'louinasseelisabethmariepharmen@gmail.com';
const EXPECTED_CARD_ID = '01a13fa5-7a55-76fa-93d6-3f6b9c8fe3a7';
const CUSTOM_DESCRIPTION = 'Rechaj manyèl sou demand kliyan — otorizasyon 15 okt 2026';

// Menm konstant ak StrowalletService.fundVirtualCard() — repwodui kalkil la
// isit la SÈLMAN pou montre rezilta a anvan egzekisyon; egzekisyon reyèl la
// pase pa svc.fundVirtualCard(), pa pa yon kopi de lojik sa a.
const CARD_RECHARGE_FEE_FLAT_USD = 1.9;
const CARD_RECHARGE_FEE_PCT = 0.019;
const OZAMAPAY_RECHARGE_FEE_PCT = 0.02;

function computeTotal(amountUsd: number, rate: number) {
  const serviceFeeUsd = CARD_RECHARGE_FEE_FLAT_USD + amountUsd * CARD_RECHARGE_FEE_PCT;
  const ozamapayFeeUsd = Math.round(amountUsd * OZAMAPAY_RECHARGE_FEE_PCT * 100) / 100;
  const totalUsd = amountUsd + serviceFeeUsd + ozamapayFeeUsd;
  const totalHtg = Math.ceil(totalUsd * rate);
  return { serviceFeeUsd, ozamapayFeeUsd, totalUsd, totalHtg };
}

async function main() {
  // 15 okt 2026 — StrowalletService.nfcPost() mock tout apèl founisè lè
  // APP_ENV=staging (wè isStaging()/mockStrowalletResponse()). Si job sa a
  // kouri sou ozamapay-backend-staging pa erè, yon $136 "siksè" ta rapòte
  // san okenn vrè lajan deplase — ARÈTE anvan menm konekte baz done a.
  if (process.env.APP_ENV === 'staging') {
    console.error('✗ APP_ENV=staging detekte — script sa a dwe kouri SÈLMAN sou sèvis pwodiksyon an (ozamapay-backend, srv-d8707dvavr4c73egsns0). ARÈTE.');
    process.exit(0);
    return;
  }

  const confirm = process.argv.includes('--confirm');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);
  const svc = app.get(StrowalletService);
  const masterId = process.env.OZAMAPAY_MASTER_ID;

  try {
    const user = await prisma.user.findUnique({
      where: { email: EMAIL },
      include: { wallet: true, virtualCards: true },
    });
    if (!user || !user.wallet) {
      console.error('✗ Itilizatè oswa wallet pa jwenn — ARÈTE');
      return;
    }

    const card = user.virtualCards.find((c) => c.cardId === EXPECTED_CARD_ID);
    if (!card) {
      console.error(`✗ Kat ${EXPECTED_CARD_ID} pa jwenn pou ${EMAIL} — ARÈTE`);
      return;
    }
    if (card.provider !== 'STROWALLET_NFC') {
      console.error(`✗ Provider="${card.provider}" ≠ STROWALLET_NFC — ARÈTE (sekirite: PA touche kat EUR/Mastercard)`);
      return;
    }
    if (card.status !== 'ACTIVE') {
      console.error(`✗ Kat status="${card.status}" ≠ ACTIVE — ARÈTE`);
      return;
    }

    const balanceBefore = Number(user.wallet.balance);
    const cardBalanceBefore = Number(card.balance);
    const rate = await svc.getExchangeRate();

    // Rezoud pi gwo montan $ antye ki respekte: ceil(totalUsd(amount)*rate) <= balans
    let amountUsd = Math.min(500, Math.max(0, Math.floor(balanceBefore / rate) + 2));
    let calc = computeTotal(amountUsd, rate);
    while (amountUsd > 0 && calc.totalHtg > balanceBefore) {
      amountUsd -= 1;
      calc = computeTotal(amountUsd, rate);
    }

    console.log('── Kalkil (an dirèk, done live) ──────────────────────────────');
    console.log(`  to USD_HTG aktyèl:     ${rate}`);
    console.log(`  balans wallet anvan:   ${balanceBefore} HTG`);
    console.log(`  balans kat anvan:      $${cardBalanceBefore}`);
    console.log(`  montan $ rezoud:       $${amountUsd}`);
    console.log(`  frè sèvis (1.90+1.9%): $${calc.serviceFeeUsd.toFixed(3)}`);
    console.log(`  frè OZAMAPAY (2%):     $${calc.ozamapayFeeUsd}`);
    console.log(`  total USD:             $${calc.totalUsd.toFixed(3)}`);
    console.log(`  total HTG pou debite:  ${calc.totalHtg} HTG`);
    console.log(`  balans wallet apre:    ${balanceBefore - calc.totalHtg} HTG (si siksè)`);
    console.log(`  balans kat apre:       $${cardBalanceBefore + amountUsd} (si siksè)`);
    console.log('───────────────────────────────────────────────────────────');

    if (amountUsd < 3) {
      console.log(`\n⚠ Rezilta a ($${amountUsd}) pi piti pase minimòm $3 StroWallet mande — KANPE, pa egzekite.`);
      return;
    }

    if (!confirm) {
      console.log('\n[DRY-RUN] Pa gen okenn ekri BDD ni apèl founisè. Kouri ak --confirm pou egzekite pou tout bon.');
      return;
    }

    console.log(`\n[LIVE] svc.fundVirtualCard(userId, ${amountUsd}) — menm chemen/kalkil/to ak fundVirtualCard() nòmal la...`);
    const execStart = new Date();
    try {
      const result = await svc.fundVirtualCard(user.id, amountUsd);
      console.log('✓✓✓ SIKSÈ ✓✓✓', JSON.stringify(result));

      const tx = await prisma.transaction.findFirst({
        where: { senderWalletId: user.wallet.id, type: 'CARD', status: 'COMPLETED', createdAt: { gte: execStart } },
        orderBy: { createdAt: 'desc' },
      });
      if (tx) {
        await prisma.transaction.update({ where: { id: tx.id }, data: { description: CUSTOM_DESCRIPTION } });
        console.log(`  ✓ Transaction ${tx.id} deskripsyon chanje: "${CUSTOM_DESCRIPTION}"`);
      } else {
        console.warn('  ⚠ Pa jwenn Transaction COMPLETED ki fèk kreye pou chanje deskripsyon — verifye manyèlman.');
      }

      if (masterId) {
        await prisma.adminActionLog.create({
          data: {
            adminId: masterId,
            action: 'MANUAL_RECHARGE_FULL_BALANCE',
            targetType: 'VirtualCard',
            targetId: card.id,
            details: JSON.stringify({ email: EMAIL, amountUsd, totalHtg: calc.totalHtg, result: 'SUCCESS', note: CUSTOM_DESCRIPTION }),
          },
        });
      }

      const after = await prisma.user.findUnique({ where: { id: user.id }, include: { wallet: true, virtualCards: true } });
      const cardAfter = after?.virtualCards.find((c) => c.cardId === EXPECTED_CARD_ID);
      console.log('\n── Rezilta final ──');
      console.log(`  balans wallet apre: ${after?.wallet?.balance} HTG`);
      console.log(`  balans kat apre:    $${cardAfter?.balance}`);
    } catch (err: any) {
      const rawDetail = err?.strowalletDetail ?? err?.message ?? 'inkoni';
      console.log('✗✗✗ ECHWE ✗✗✗');
      console.log('Mesaj brit founisè a:', rawDetail);

      await prisma.cardCreationFailure.create({
        data: {
          userId: user.id,
          email: EMAIL,
          context: 'RECHARGE_MANUAL',
          errorMessage: typeof rawDetail === 'string' ? rawDetail : JSON.stringify(rawDetail),
        },
      });
      console.log('  ✓ Mesaj brit sove nan CardCreationFailure (context=RECHARGE_MANUAL)');

      if (masterId) {
        await prisma.adminActionLog.create({
          data: {
            adminId: masterId,
            action: 'MANUAL_RECHARGE_FULL_BALANCE',
            targetType: 'VirtualCard',
            targetId: card.id,
            details: JSON.stringify({ email: EMAIL, amountUsd, totalHtg: calc.totalHtg, result: 'FAILED', error: rawDetail }),
          },
        });
      }
    }
  } finally {
    await app.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(0);
  });
