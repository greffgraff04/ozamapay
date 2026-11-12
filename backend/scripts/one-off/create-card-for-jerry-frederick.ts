/**
 * create-card-for-jerry-frederick.ts
 *
 * Script one-off pou kliyan frederickjerry001@gmail.com SÈLMAN. PA reyize
 * pou lòt kliyan san apwobasyon biznis, dat, ak rezon klè.
 *
 * KONTEKS: Kyc APPROVED, adrès korije (Kyc.line1 "Bouette" → "107 Rue
 * Champlois", Kyc.lastName "Frederick " → "Frederick" — wè
 * fix-jerry-frederick-kyc-address.ts, egzekite 12 nov 2026). Wallet HTG
 * kredite ak yon kado 405 HTG (= $3) pa Mr. Greffin — wè
 * credit-jerry-frederick-card-gift.ts. Mr. Greffin vle kreye kat USD la LI
 * MENM pou kliyan an (pa tann li re-eseye depi app la).
 *
 * APWÒCH: AUKENN nouvo lojik, AUKENN kontoune verifikasyon — script sa a
 * rele DIRÈKTEMAN `StrowalletService.createAndFundCard(userId, amountUsd)`,
 * MENM metòd ki rele lè yon kliyan kreye kat li nan app la. Tout verifikasyon
 * (KYC, montan, kat ki egziste, adrès, balans) rete INTACT paske se menm
 * fonksyon an.
 *
 * AMOUNT: $3 pa defo (minimòm otorize, `--amount=N` pou chanje, $3-$500).
 * PA GEN FRÈ kliyan — createAndFundCard() konvèti amountUsd an HTG sèlman
 * (totalHtg = ceil(amountUsd × USD_HTG)), okenn majorasyon/frè adisyonèl
 * pou kliyan (CARD_CREATION_FEE_USD $2.50 se yon frè FOUNISÈ OZAMAPAY
 * absòbe, pa yon debi kliyan — wè kòmantè nan createAndFundCard()).
 *
 * NETWAYAJ ADRÈS (menm apwòch ak create-card-for-dieumima-derissaint.ts):
 * anvan kreyasyon an, script la TRIM sèlman Kyc.line1/city/state pou
 * KLIYAN SA A (espas vid nan kòmansman/fen — pa touche karaktè anndan yo,
 * pa touche zipCode/country/telefòn/dateOfBirth/idNumber). Ekri nan yon
 * transaksyon ak yon AdminActionLog avan/apre SÈLMAN si gen anyen pou
 * netwaye. AUKENN chanjman nan strowallet.service.ts.
 *
 * PENDING_VERIFICATION: createAndFundCard() ka retounen yon rezilta
 * tranzitwa { status: 'PENDING_VERIFICATION', message } si cardkyc reponn
 * "pending" — sa a PA yon siksè final (background poll
 * pollPendingCardCreations() ap verifye pita). Script la tcheke
 * EGZAKTEMAN `result.status === 'PENDING_VERIFICATION'` epi li rapòte sa
 * aparamman, pa kòm yon siksè.
 *
 * Safety: DRY-RUN pa default — montre wallet, presondisyon, kalkil debi, ak
 * rezilta resolveNfcIdentity()/sanitizeCityForProvider()/resolveNfcCountry()
 * (san valè sansib — pa id_number konplè, pa idImage) san AUKENN apèl
 * StroWallet. --confirm rele vrè `createAndFundCard()` (debi wallet REYÈL +
 * apèl founisè REYÈL si tout presondisyon yo pase). Refize kouri si
 * APP_ENV=staging.
 *
 * Kòmand (nan /backend):
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/create-card-for-jerry-frederick.ts                      # dry-run, $3
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/create-card-for-jerry-frederick.ts --amount=10            # dry-run, $10
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/create-card-for-jerry-frederick.ts --confirm              # LIVE, $3
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { StrowalletModule } from '../../src/strowallet/strowallet.module';
import { StrowalletService } from '../../src/strowallet/strowallet.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { AlertCooldownModule } from '../../src/common/alert-cooldown/alert-cooldown.module';
import { isStaging } from '../../src/config/app-env';

@Module({ imports: [PrismaModule, AlertCooldownModule, StrowalletModule] })
class BootstrapModule {}

const CUSTOMER_EMAIL = 'frederickjerry001@gmail.com';
const USER_ID = 'c7909fe7-9cc2-429f-92a5-0475f8da841a';
const MASTER_ID = process.env.OZAMAPAY_MASTER_ID as string;

function parseAmount(): number {
  const arg = process.argv.find((a) => a.startsWith('--amount='));
  return arg ? Number(arg.split('=')[1]) : 3;
}

async function main() {
  if (isStaging()) {
    console.error('✗ APP_ENV=staging — script sa a se yon korije pwodiksyon espesifik, pa gen sans nan staging. ARÈTE.');
    process.exitCode = 1;
    return;
  }

  const confirm = process.argv.includes('--confirm');
  const amountUsd = parseAmount();

  const app = await NestFactory.createApplicationContext(BootstrapModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);
  const svc = app.get(StrowalletService);

  try {
    // ── 0. Jwenn kliyan an, verifye email matche ────────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: USER_ID },
      include: { wallet: true, kyc: true, virtualCards: true, currencyBalances: true },
    });
    if (!user) {
      console.error(`✗ Pa jwenn itilizatè userId=${USER_ID} — ARÈTE`);
      return;
    }
    if (user.email.toLowerCase() !== CUSTOMER_EMAIL.toLowerCase()) {
      console.error(`✗ userId=${USER_ID} pa matche email ${CUSTOMER_EMAIL} (li se ${user.email}) — ARÈTE`);
      return;
    }

    console.log('── Kliyan ────────────────────────────────────────────────────');
    console.log(`  ${user.name} (${user.email})`);
    console.log(`  userId: ${user.id}`);

    // ── 1. Wallet HTG/USD (balans reyèl) ────────────────────────────────────
    console.log('\n── 1. Wallet (balans reyèl) ─────────────────────────────────');
    console.log(`  HTG (Wallet.balance): ${user.wallet ? user.wallet.balance : 'PA GEN WALLET'}`);
    const usdBalance = user.currencyBalances.find((c) => c.currency === 'USD');
    const eurBalance = user.currencyBalances.find((c) => c.currency === 'EUR');
    console.log(`  USD (WalletCurrencyBalance): ${usdBalance ? usdBalance.balance : '0 (pa gen antre)'}`);
    console.log(`  EUR (WalletCurrencyBalance): ${eurBalance ? eurBalance.balance : '0 (pa gen antre)'}`);
    console.log('  (Nòt: createAndFundCard() li SÈLMAN Wallet.balance HTG — USD/EUR pi wo a pa itilize pou debi kat la.)');

    // ── 0b. Netwayaj (trim) Kyc.line1/city/state — avan/apre ───────────────
    const oldLine1 = user.kyc?.line1 ?? null;
    const oldCity = user.kyc?.city ?? null;
    const oldState = user.kyc?.state ?? null;
    const trimmedLine1 = oldLine1 !== null ? oldLine1.trim() : null;
    const trimmedCity = oldCity !== null ? oldCity.trim() : null;
    const trimmedState = oldState !== null ? oldState.trim() : null;
    const addressNeedsTrim =
      user.kyc !== null && (oldLine1 !== trimmedLine1 || oldCity !== trimmedCity || oldState !== trimmedState);

    console.log('\n── 0b. Netwayaj (trim) Kyc.line1/city/state (sèlman espas, pa karaktè) ──');
    if (!user.kyc) {
      console.log('  (pa gen Kyc, pa ka netwaye)');
    } else if (!addressNeedsTrim) {
      console.log('  ✓ line1/city/state deja netwaye (pa gen espas vid kòmansman/fen) — pa gen chanjman nesesè.');
    } else {
      console.log(`  line1 (AVAN): "${oldLine1}" → (APRE): "${trimmedLine1}"`);
      console.log(`  city  (AVAN): "${oldCity}" → (APRE): "${trimmedCity}"`);
      console.log(`  state (AVAN): "${oldState}" → (APRE): "${trimmedState}"`);
      console.log('  (zipCode, country, telefòn, dateOfBirth, idNumber — OKENN TOUCHE)');
    }

    // ── 4. Presondisyon kòd la tcheke (menm lòd ak createAndFundCard()) ─────
    console.log(`\n── 4. Presondisyon (menm lòd kòd createAndFundCard(), amountUsd=$${amountUsd}) ──`);
    let blocked = false;

    if (!Number.isFinite(amountUsd) || amountUsd < 3 || amountUsd > 500) {
      console.log(`  ✗ Montan $${amountUsd} andeyò limit [$3, $500] — BLOKE ("Montan dwe ant $3 ak $500")`);
      blocked = true;
    } else {
      console.log(`  ✓ Montan $${amountUsd} nan limit [$3, $500]`);
    }

    const existingCard = user.virtualCards.find(
      (c) => c.provider === 'STROWALLET_NFC' && ['ACTIVE', 'FROZEN', 'PENDING_RECHARGE'].includes(c.status),
    );
    if (existingCard) {
      console.log(`  ✗ Kliyan an gen deja yon kat StroWallet NFC ${existingCard.status} (cardId=${existingCard.cardId}) — BLOKE ("Ou genyen yon kat vityèl deja")`);
      blocked = true;
    } else {
      console.log('  ✓ Pa gen kat StroWallet NFC ACTIVE/FROZEN/PENDING_RECHARGE ki egziste');
    }

    console.log(`\n  (Tout kat VirtualCard ki egziste pou kont sa a, nenpòt provider/status — SELECT enfòmasyon sèlman):`);
    if (user.virtualCards.length === 0) {
      console.log('    okenn');
    } else {
      for (const c of user.virtualCards) {
        console.log(`    provider=${c.provider} status=${c.status} currency=${c.currency} createdAt=${c.createdAt.toISOString()}`);
      }
    }

    if (!user.wallet) {
      console.log('  ✗ Pa gen Wallet — BLOKE ("Wallet introuvable")');
      blocked = true;
    } else {
      console.log('  ✓ Wallet egziste');
    }

    if (!user.kyc || user.kyc.status !== 'APPROVED') {
      console.log(`  ✗ Kyc.status="${user.kyc?.status ?? 'AUKENN'}" (pa APPROVED) — BLOKE ("KYC ou dwe apwouve pou kreye yon kat")`);
      blocked = true;
    } else {
      console.log('  ✓ Kyc.status=APPROVED');
    }

    const addressTooShort = user.kyc ? svc.isAddressTooShort(trimmedLine1) : true;
    if (addressTooShort) {
      console.log(`  ✗ Adrès (line1 apre trim="${trimmedLine1 ?? ''}") pi kout pase ${svc.MIN_ADDRESS_LENGTH} karaktè — BLOKE (kreye CardCreationAddressBlock + notifye)`);
      blocked = true;
    } else {
      console.log(`  ✓ Adrès (line1 apre trim >= ${svc.MIN_ADDRESS_LENGTH} karaktè)`);
    }

    // ── Enfòmasyon istorik (PA yon presondisyon kòd la tcheke — jis kontèks) ──
    const openPending = await prisma.cardCreationPending.findFirst({ where: { userId: USER_ID, resolvedAt: null } });
    const openBlock = await prisma.cardCreationAddressBlock.findFirst({ where: { userId: USER_ID, resolvedAt: null } });
    console.log('\n  (Enfòmasyon — createAndFundCard() PA tcheke sa yo kòm presondisyon antre, men itil pou konfime pa gen rès an atant):');
    console.log(`    CardCreationPending ouvè (resolvedAt=null): ${openPending ? 'WI — ' + openPending.id : 'okenn'}`);
    console.log(`    CardCreationAddressBlock ouvè (resolvedAt=null): ${openBlock ? 'WI — ' + openBlock.id : 'okenn'}`);

    // ── 2/3. Kalkil debi (sèlman si pa bloke deja — egzateman jan kòd la fè) ──
    let totalHtg: number | null = null;
    let exchangeRate: number | null = null;
    let sufficient = false;
    if (!blocked) {
      exchangeRate = await svc.getExchangeRate();
      totalHtg = Math.ceil(amountUsd * exchangeRate);
      sufficient = user.wallet ? Number(user.wallet.balance) >= totalHtg : false;
      console.log('\n── 2. Kalkil debi (menm fòmil ak createAndFundCard()) ─────────');
      console.log(`  Taux USD_HTG aktyèl: ${exchangeRate}`);
      console.log(`  Premye fon kat: $${amountUsd} USD`);
      console.log(`  Frè kliyan adisyonèl: $0 (OKENN — frè founisè $2.50 absòbe pa OZAMAPAY, pa kliyan)`);
      console.log(`  Total pou debi wallet HTG: ${totalHtg} HTG (= ceil($${amountUsd} × ${exchangeRate}))`);
      console.log(`  Balans wallet HTG aktyèl: ${user.wallet?.balance ?? 0} HTG`);
      console.log(`  Balans ase pou $${amountUsd}? ${sufficient ? 'WI' : 'NON'}`);
      if (!sufficient && user.wallet) {
        const shortfall = totalHtg - Number(user.wallet.balance);
        console.log(`\n── 3. Manke ──`);
        console.log(`  Manke ${shortfall} HTG pou kreye kat $${amountUsd} la.`);
      }
    } else {
      console.log('\n── 2/3. Kalkil debi SKIP — gen presondisyon ki bloke deja pi wo a ──');
    }

    // ── 5. Payload konplè StroWallet/cardkyc ap voye (san valè sansib) ──────
    console.log('\n── 5. Payload cardkyc konplè ki ta voye bay founisè a (san valè sansib) ──');
    if (user.kyc) {
      const identity = (svc as any).resolveNfcIdentity({
        name: user.name,
        phone: user.phone,
        kyc: { phoneNumber: user.kyc.phoneNumber, firstName: user.kyc.firstName, lastName: user.kyc.lastName },
      });
      const providerFirstName = svc.sanitizeNameForProvider(identity.firstName);
      const providerLastName = svc.sanitizeNameForProvider(identity.lastName);
      const { city: providerCity, line1: providerLine1 } = svc.sanitizeCityForProvider(trimmedCity, trimmedLine1);
      const providerCountry = (svc as any).resolveNfcCountry(user.kyc.country);
      const isoDob = user.kyc.dateOfBirth
        ? new Date(user.kyc.dateOfBirth).toISOString().slice(0, 10)
        : '1990-01-01';
      const idNumberLen = (user.kyc.idNumber || '').length;

      console.log(`  first_name: "${providerFirstName}"`);
      console.log(`  last_name:  "${providerLastName}"`);
      console.log(`  dial_code: ${identity.dialCode}`);
      console.log(`  phone_number: ${identity.phone}`);
      console.log(`  country: "${providerCountry}" (ISO alpha-2 "${user.kyc.country}" konvèti)`);
      console.log(`  state: "${(trimmedState || '').trim()}"`);
      console.log(`  city:  "${providerCity}" (apre netwayaj/koupe)`);
      console.log(`  line1: "${(providerLine1 || '').trim()}" (apre netwayaj)`);
      console.log(`  postal_code (zip): "${user.kyc.zipCode}"`);
      console.log(`  id_type: "passport" (kòdi an dur pou tout moun, pa gen rapò ak Kyc.idType="${user.kyc.idType}")`);
      console.log(`  id_number: ${idNumberLen} karaktè (valè PA montre)`);
      console.log(`  date_of_birth: "${isoDob}"`);
    } else {
      console.log('  (pa gen Kyc, pa ka kalkile)');
    }

    console.log('\n─────────────────────────────────────────────────────────────');
    console.log(blocked ? '  RÉZILTA: BLOKE — createAndFundCard() ta jete yon erè anvan nenpòt apèl founisè.' : '  RÉZILTA: Tout presondisyon LOKAL yo pase — createAndFundCard() ta rive jiska apèl cardkyc REYÈL.');
    console.log('  (Rezilta founisè a — approved/rejected/pending — rete ENKONI jiskaske yon vrè apèl fèt.)');

    if (!confirm) {
      console.log('\n[DRY-RUN] Pa gen okenn apèl StroWallet, ekri BDD, debi wallet, ni imèl. Kouri ak --confirm pou egzekite pou tout bon.');
      return;
    }

    if (blocked) {
      console.error('\n✗ Yon presondisyon bloke — pa gen sans kouri --confirm, createAndFundCard() ta jete menm erè a. ARÈTE.');
      process.exitCode = 1;
      return;
    }

    if (addressNeedsTrim) {
      if (!MASTER_ID) {
        console.error('\n✗ OZAMAPAY_MASTER_ID pa defini nan .env — ARÈTE anvan nenpòt ekri BDD.');
        process.exitCode = 1;
        return;
      }
      console.log('\n[LIVE] Netwaye (trim) Kyc.line1/city/state + AdminActionLog nan yon transaksyon...');
      const addressDetails =
        `Kyc.line1 "${oldLine1}" → "${trimmedLine1}", Kyc.city "${oldCity}" → "${trimmedCity}", ` +
        `Kyc.state "${oldState}" → "${trimmedState}" (trim espas vid sèlman, anvan kreyasyon kat, apwouve pa Mr. Greffin).`;
      await prisma.$transaction(async (tx) => {
        await tx.kyc.update({
          where: { userId: USER_ID },
          data: { line1: trimmedLine1!, city: trimmedCity!, state: trimmedState! },
        });
        await tx.adminActionLog.create({
          data: {
            adminId: MASTER_ID,
            action: 'KYC_ADDRESS_WHITESPACE_TRIMMED',
            targetType: 'Kyc',
            targetId: user.kyc!.id,
            details: addressDetails,
          },
        });
      });
      console.log('  ✓ Adrès netwaye + AdminActionLog kreye.');
    } else {
      console.log('\n[LIVE] Adrès deja netwaye — SKIP trim step.');
    }

    console.log(`\n[LIVE] Rele vrè StrowalletService.createAndFundCard(userId, $${amountUsd}) — menm metòd app la rele...`);
    let result: any;
    try {
      result = await svc.createAndFundCard(USER_ID, amountUsd);
    } catch (err: any) {
      console.error('\n✗ createAndFundCard() jete yon erè — ARÈTE, PA relanse:');
      console.error(`  message: ${err?.message ?? err}`);
      if (err?.strowalletDetail) console.error(`  strowalletDetail: ${err.strowalletDetail}`);
      process.exitCode = 1;
      return;
    }

    if (result?.status === 'PENDING_VERIFICATION') {
      console.log('\n⏳ Rezilta: PENDING_VERIFICATION — SA A PA YON SIKSÈ FINAL.');
      console.log(`  message: ${result.message}`);
      console.log('  (cardkyc reponn "pending" — background poll pollPendingCardCreations() chak 30s ap konplete kreyasyon an pita si l rezoud "approved", oswa l ap echwe/ranbouse si l rezoud "rejected". Pa gen pwochen aksyon isit la.)');
    } else {
      console.log('\n✓ Rezilta (siksè):', JSON.stringify(result));
    }
    console.log('[LIVE] Fini.');
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
