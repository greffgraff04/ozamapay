/**
 * cardkyc-only-test-submit.ts
 *
 * Demand Mr. Greffin, 4 oct 2026 — teste solidite fix body/limit la (commit
 * ca10ca5) sou plizyè vrè kont OZAMAPAY ki DEJA KYC APPROVED, san kreye
 * okenn nouvo kat (pa gen debi wallet, pa gen create-nfc-card). Soumèt
 * SÈLMAN etap cardkyc la (ki itilize vrè nfcPost() StrowalletService la,
 * kidonk li teste REYÈLMAN fix id_front_image/body la), youn alafwa.
 *
 * Done KYC itilize a soti 100% nan DB OZAMAPAY (pa gen anyen envante) —
 * menm konstriksyon cardkycParams ak createAndFundCard() (resolveNfcIdentity,
 * resolveIdFrontImageBase64, resolveDialCode, resolveNfcCountry), via `as any`
 * pou rele metòd prive yo san dupliye lojik la.
 *
 * Verifikasyon anvan egzekisyon: KYC APPROVED, ZERO VirtualCard STROWALLET_NFC
 * egziste pou kont sa a, ZERO CardCreationFailure — sa evite re-soumèt yon
 * demand ki ta deja genyen yon rezilta REJETE/APPROVED sou dashboard
 * ziiropay (fo rezilta pou tès la).
 *
 * Safety: DRY-RUN pa default. --confirm pou soumèt cardkyc REYÈL bay
 * ziiropay.com. PA JANM rele create-nfc-card — script sa a SÈLMAN gen aksè
 * a cardkyc.
 *
 * Kòmand (nan /backend, oswa kòm Render job pou bon sekrè ZIIROPAY_PUBLIC_KEY):
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/cardkyc-only-test-submit.ts --email=xxx@gmail.com            # dry-run
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/cardkyc-only-test-submit.ts --email=xxx@gmail.com --confirm  # live
 */

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { StrowalletModule } from '../../src/strowallet/strowallet.module';
import { StrowalletService } from '../../src/strowallet/strowallet.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { AlertCooldownModule } from '../../src/common/alert-cooldown/alert-cooldown.module';

@Module({ imports: [PrismaModule, AlertCooldownModule, StrowalletModule] })
class CardkycOnlyBootstrapModule {}

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

  const app = await NestFactory.createApplicationContext(CardkycOnlyBootstrapModule, { logger: ['error', 'warn', 'log'] });
  const prisma = app.get(PrismaService);
  const svc = app.get(StrowalletService) as any;

  try {
    const user = await prisma.user.findFirst({ where: { email }, include: { wallet: true, kyc: true } });
    if (!user) {
      console.error(`✗ Pa jwenn itilizatè ak email ${email} — ARÈTE`);
      return;
    }
    if (!user.kyc || user.kyc.status !== 'APPROVED') {
      console.error(`✗ KYC pa APPROVED (status="${user.kyc?.status}") — ARÈTE`);
      return;
    }
    const existingCard = await prisma.virtualCard.findFirst({ where: { userId: user.id, provider: 'STROWALLET_NFC' } });
    if (existingCard) {
      console.error(`✗ Kont sa a DEJA gen yon VirtualCard STROWALLET_NFC (status=${existingCard.status}) — ARÈTE (fo rezilta posib).`);
      return;
    }
    const existingFailure = await prisma.cardCreationFailure.findFirst({ where: { userId: user.id } });
    if (existingFailure) {
      console.error('✗ Kont sa a DEJA gen yon CardCreationFailure anrejistre — ARÈTE (fo rezilta posib).');
      return;
    }

    console.log('── Kliyan ────────────────────────────────────────────────');
    console.log(`  ${user.name} (${user.email})`);
    console.log(`  KYC: ${user.kyc.status} | country=${user.kyc.country} | idNumber present=${!!user.kyc.idNumber}`);
    console.log('  ✓ Pa gen VirtualCard STROWALLET_NFC ni CardCreationFailure egziste — OK pou tès cardkyc-sèlman');

    const { firstName, lastName, phone, dialCode } = svc.resolveNfcIdentity(user);
    const isoDob = user.kyc.dateOfBirth
      ? new Date(user.kyc.dateOfBirth).toISOString().slice(0, 10)
      : '1990-01-01';
    const idFrontImageBase64 = await svc.resolveIdFrontImageBase64(user.kyc.idImage);

    const cardkycParams = {
      first_name: firstName,
      last_name: lastName,
      id_type: 'passport',
      id_number: user.kyc.idNumber || '00000000',
      id_front_image: idFrontImageBase64,
      email: user.email,
      phone_number: phone,
      date_of_birth: isoDob,
      dial_code: dialCode,
      line1: user.kyc.line1,
      city: user.kyc.city,
      state: user.kyc.state,
      postal_code: user.kyc.zipCode,
      country: svc.resolveNfcCountry(user.kyc.country),
      occupation: 'Business Owner',
      employment_status: 'self_employed',
      account_purpose: 'personal_use',
      annual_salary: '50000',
      expected_monthly_volume: '5000',
      place_of_birth: user.kyc.city || 'Port-au-Prince',
    };

    console.log(`\n  id_front_image: ${idFrontImageBase64.length} karaktè base64 (gade log StrowalletService pi wo pou konfime si li te konprese)`);

    console.log('\n── Plan ─────────────────────────────────────────────────');
    console.log('  nfcPost(\'cardkyc\', cardkycParams) — SÈLMAN. PA create-nfc-card. PA debi wallet.');
    console.log('─────────────────────────────────────────────────────────────');

    if (!confirm) {
      console.log('\n[DRY-RUN] Pa gen okenn apèl ziiropay.com. Kouri ak --confirm pou soumèt pou tout bon.');
      return;
    }

    console.log('\n[LIVE] Rele cardkyc REYÈL bay ziiropay.com...\n');
    try {
      const kycResponse = await svc.nfcPost('cardkyc', cardkycParams);
      console.log('✓✓✓ CARDKYC REPONS ✓✓✓');
      console.log(JSON.stringify(kycResponse, null, 2));
      const customerId = kycResponse?.response?.customer_id || kycResponse?.data?.customer_id || kycResponse?.customer_id;
      const kycStatus = kycResponse?.response?.status || kycResponse?.data?.status || kycResponse?.status;
      console.log(`\nRezime: customer_id="${customerId}", status="${kycStatus}"`);
    } catch (err: any) {
      console.log('✗✗✗ CARDKYC ECHWE/REJTE ✗✗✗');
      console.log('Mesaj kliyan (jenerik):', err?.message);
      console.log('Detay StroWallet brit (admin-sèlman):', err?.strowalletDetail ?? '(pa gen)');
    }
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
