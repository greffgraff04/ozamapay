/**
 * relaunch-juliana-card-after-phone-fix.ts
 *
 * Demand Mr. Greffin, 14 oct 2026 — Juliana Lagène (lagenejuliana8@gmail.com)
 * te eseye kreye yon kat NFC 6 fwa (11-14 oktòb), tout rejte pa cardkyc
 * (ziiropay.com) ak "an existing customer already matches this phone under
 * a different email ... customer_id=01a10e0e-8242-7d6b-976a-056aa6c876d1".
 * Envestigasyon konfime: ansyen telefòn (50944621984) deja pran bò kote
 * founisè a pou yon lòt kliyan ki pa nan DB nou an; nou pa gen okenn mwayen
 * pou verifye/reyitilize sa customer_id sa a nan kòd nou an jodi a. Kliyan
 * an bay yon nouvo nimewo: 50949088716 (verifye disponib nan DB nou an).
 *
 * Sèl Kyc.phoneNumber ale nan cardkyc (StrowalletService.resolveNfcIdentity():
 * Kyc.phoneNumber se sous prensipal, User.phone se fallback sèlman si
 * Kyc.phoneNumber vid — ki pa ka a). User.phone Juliana a deja null, pa gen
 * rezon touche l. Kyc.phoneNumber PA itilize pou login/OTP/2FA (sa yo ale nan
 * User.phone, wè AuthService/OtpService) ni pou matching depo MonCash/
 * NatCash (ki pa gen chan telefòn ditou) — chanjman sa a pa ka kraze koneksyon
 * ni lye depo kliyan an.
 *
 * 14 oct 2026 — premye tantativ (lokal) echwe pou yon rezon ki pa gen rapò
 * ak telefòn: "Public key is required." (ZIIROPAY_PUBLIC_KEY pa konfigire
 * nan anviwònman lokal la). Kyc.phoneNumber te DEJA chanje avèk siksè pandan
 * tantativ sa a — script la kounye a IDEMPOTENT sou etap sa a (verifye valè
 * aktyèl la anvan ekri, sote si li deja kòrèk). Kouri kounyeya kòm Render Job
 * (anviwònman kote ZIIROPAY_PUBLIC_KEY egziste).
 *
 * 14 oct 2026 — ajoute yon tcheke cardkycstatus() AVAN nenpòt debi/apèl
 * createAndFundCard(), menm jan ak ka Dony: si ZiiroPay deja gen yon
 * estati REJECTED pou email sa a POU MENM REZON TELEFÒN lan (menm si nou
 * sot chanje l — API ZiiroPay ka toujou gen ansyen estati a kenbe pou kont
 * sa a), script la KANPE san kreye anyen, san debi kliyan an pou granmesi.
 * Si estati a se nenpòt lòt bagay (pa jwenn, pending, approved, rejte pou
 * yon lòt rezon), script la kontinye nòmalman.
 *
 * Safety: DRY-RUN pa default — montre Kyc.phoneNumber aktyèl, rezilta
 * cardkycstatus, balans, elijiblite, AVAN nenpòt ekriti/debi. OKENN
 * chanjman DB, OKENN apèl ki modifye eta, san --confirm (cardkycstatus se
 * lekti sèlman, li tou rele pandan dry-run pou montre rezilta a davans).
 * Transaction (siksè kou echèk) kreye AN DEDAN
 * StrowalletService.createAndFundCard() li menm (menm jan ak
 * relaunch-rimsky-card-after-city-fix.ts) — LedgerEntry pa aplikab pou flow
 * kat StroWallet (modèl sa a pa itilize LedgerEntry ditou, wè grep nan
 * src/strowallet/), kidonk pa gen LedgerEntry pou kreye isit la.
 *
 * Kòmand:
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/relaunch-juliana-card-after-phone-fix.ts            # dry-run
 *   ... --confirm  # live: mete ajou Kyc.phoneNumber (si nesesè) + relanse kreyasyon kat
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

const EMAIL = 'lagenejuliana8@gmail.com';
const OLD_PHONE_DIGITS = '44621984'; // 50944621984 — deja pran bò kote founisè a
const NEW_PHONE_FULL = '50949088716'; // bay pa kliyan an, verifye disponib nan DB nou an
const AMOUNT_USD = 6; // menm montan ak dènye tantativ li (14 oct 2026, 16:33:44)

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

    // ── Idempotent: telefòn ka deja chanje (tantativ lokal 14 oct la) ──────
    const currentDigits = (user.kyc.phoneNumber || '').replace(/\D/g, '');
    const newDigits = NEW_PHONE_FULL.replace(/\D/g, '');
    const alreadyCorrect = currentDigits === newDigits;
    if (!alreadyCorrect && !currentDigits.includes(OLD_PHONE_DIGITS)) {
      console.error(`✗ Kyc.phoneNumber aktyèl ("${user.kyc.phoneNumber}") pa matche ni ansyen (${OLD_PHONE_DIGITS}) ni nouvo (${NEW_PHONE_FULL}) nimewo atandi — ARÈTE, verifye manyèlman.`);
      return;
    }

    const conflict = await prisma.user.findFirst({
      where: {
        id: { not: user.id },
        OR: [
          { phone: { contains: '49088716' } },
          { kyc: { phoneNumber: { contains: '49088716' } } },
        ],
      },
    });
    if (conflict) { console.error(`✗ Nouvo nimewo a deja itilize pa kont ${conflict.id} — ARÈTE.`); return; }

    const exchangeRate = await svc.getExchangeRate();
    const totalHtg = Math.ceil(AMOUNT_USD * exchangeRate);

    console.log('── Kliyan ────────────────────────────────────────────────');
    console.log(`  ${user.name} (${user.email})`);
    console.log(`  User.phone (DB, pa touche — deja null/segondè, pa ale nan cardkyc): "${user.phone}"`);
    console.log(`  Kyc.phoneNumber AKTYÈL: "${user.kyc.phoneNumber}"`);
    console.log(`  Kyc.phoneNumber atandi apre: "${NEW_PHONE_FULL}" (${alreadyCorrect ? 'DEJA kòrèk — sote mizajou' : 'ap mete ajou si --confirm'})`);
    console.log(`  wallet: balans aktyèl: ${user.wallet.balance} HTG`);
    console.log(`  Kou echanj: ${exchangeRate} HTG/USD → koute total: ${totalHtg} HTG pou $${AMOUNT_USD}`);

    if (Number(user.wallet.balance) < totalHtg) {
      console.error(`✗ Balans ennsifizan (${user.wallet.balance} HTG < ${totalHtg} HTG) — ARÈTE.`);
      return;
    }

    // ── Pre-check cardkycstatus AVAN nenpòt debi — lekti sèlman, rele pandan
    // dry-run tou pou montre rezilta a davans. Itilize nfcGet() prive a (menm
    // jan ak resolvePendingCardCreation() anndan StrowalletService) pou rete
    // koheran ak URL/public_key routing ki deja egziste — pa dupliye lojik la
    // ak yon apèl axios separe.
    console.log('\n── Tcheke cardkycstatus AVAN debi/kreyasyon ─────────────────');
    let statusResponse: any = null;
    try {
      statusResponse = await (svc as any).nfcGet('cardkycstatus', { email: user.email });
      console.log(JSON.stringify(statusResponse, null, 2));
    } catch (err: any) {
      console.log(`  (cardkycstatus echwe/pa jwenn — pa yon blokaj, kontinye: ${err?.message ?? err})`);
    }

    const kycStatus: string | undefined =
      statusResponse?.data?.status || statusResponse?.response?.status || statusResponse?.status;
    const rawMessage: string = JSON.stringify(statusResponse ?? {}).toLowerCase();
    const isRejected = typeof kycStatus === 'string' && /reject|declin/i.test(kycStatus);
    const mentionsPhone = rawMessage.includes('phone') || rawMessage.includes('telefòn') || rawMessage.includes('telephone');

    if (isRejected && mentionsPhone) {
      console.error('\n✗✗✗ ARÈTE — cardkycstatus retounen REJECTED pou menm rezon telefòn lan ✗✗✗');
      console.error('Rezon brit (admin-sèlman):', JSON.stringify(statusResponse));
      console.error('Pa gen okenn debi, okenn kreyasyon kat. Nou bezwen mande ZiiroPay libere customer_id 01a10e0e-8242-7d6b-976a-056aa6c876d1 la.');
      return;
    }

    console.log(`  ✓ cardkycstatus pa montre yon rejè telefòn aktif (status="${kycStatus ?? '(pa jwenn/vid)'}") — kontinye`);
    console.log('  ✓ Elijib pou mete ajou telefòn (si nesesè) + relanse kreyasyon kat la');

    if (!confirm) {
      console.log('\n[DRY-RUN] Pa gen okenn chanjman Kyc.phoneNumber, okenn debi, okenn apèl kreyasyon kat. Kouri ak --confirm pou fè l pou tout bon.');
      return;
    }

    if (alreadyCorrect) {
      console.log('\n[LIVE] Kyc.phoneNumber deja kòrèk — sote etap mizajou a.');
    } else {
      console.log('\n[LIVE] Mete ajou Kyc.phoneNumber...');
      await prisma.kyc.update({ where: { userId: user.id }, data: { phoneNumber: NEW_PHONE_FULL } });
      console.log(`  ✓ Kyc.phoneNumber → "${NEW_PHONE_FULL}"`);
    }

    console.log('\n[LIVE] Relanse createAndFundCard($' + AMOUNT_USD + ')...\n');
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
