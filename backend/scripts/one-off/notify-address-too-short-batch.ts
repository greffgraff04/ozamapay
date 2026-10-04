/**
 * notify-address-too-short-batch.ts
 *
 * Script one-off, egzekite yon sèl fwa (4 oct 2026) pou 11 kliyan espesifik
 * ki gen KYC APPROVED men Kyc.line1 < 8 karaktè (sèy StrowalletService.
 * MIN_ADDRESS_LENGTH) — menm kategori rejè ak "address1 is too short" ki
 * konfime pou Dave Angelo Pierre. Lis la jenere pa yon odit DB 4 oct 2026
 * (@see _audit-kyc-approved-short-line1.ts) epi FIKSE isit la (menm apwòch
 * ak notify-id-photo-update-request.ts) pou lis la pa elaji san vle si lòt
 * dosye ta gen menm pwoblèm nan pita — nouvo kliyan yo kouvri pa deteksyon
 * pwoaktif ki ajoute nan createAndFundCard()/finalizeReplacement().
 *
 * Okenn nan 11 kliyan sa yo pa gen yon demand kreyasyon kat an atant (yo
 * pa janm eseye) — donk SÈLMAN imèl la voye isit la, PA gen auto-kreyasyon
 * kat (pa gen anyen pou "relanse"). Lè yo reponn ak adrès korije a, itilize
 * KycService.applyCorrectedAddress() (pa egzanp via yon ti script apa oswa
 * PATCH /kyc/address) pou mete l ajou.
 *
 * Safety: DRY-RUN pa default. --confirm pou voye pou tout bon.
 *
 * Kòmand (nan /backend, oswa kòm Render job):
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/notify-address-too-short-batch.ts            # dry-run
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/notify-address-too-short-batch.ts --confirm  # live
 */

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { StrowalletModule } from '../../src/strowallet/strowallet.module';
import { MailService } from '../../src/mail/mail.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { AlertCooldownModule } from '../../src/common/alert-cooldown/alert-cooldown.module';

// StrowalletService depann sou AlertCooldownService — pa fè pati
// StrowalletModule, kidonk bezwen yon ti module bootstrap ki enpòte tou de.
@Module({ imports: [PrismaModule, AlertCooldownModule, StrowalletModule] })
class NotifyBatchBootstrapModule {}

const RECIPIENTS: { userId: string; name: string; email: string; line1: string }[] = [
  { userId: '5f0cba43-0fa6-4558-a5f3-9b2cee9b2219', name: 'Jubelcky Prophete', email: 'jubelcky.prophete2003@gmail.com', line1: 'Haiti' },
  { userId: 'c9e6281e-7546-4e70-9285-8c4f5c6aafcd', name: 'Taicha Pierre', email: 'taichapierre537@gmail.com', line1: 'Haiti' },
  { userId: 'c14eb953-1dd0-48ce-9f91-5a26bdacc0dc', name: 'Fingero Vilmar', email: 'fingerovilmar92@gmail.com', line1: 'Haiti' },
  { userId: '361d958c-7d89-4025-a137-cde4487db288', name: 'Amanda', email: 'amanda@ozama.com', line1: 'Haiti' },
  { userId: '9e91bdba-9c63-4404-bc5a-2866247054a0', name: 'Fabienne JN MICHEL', email: 'jnmichelfabienne@gmail.com', line1: '07' },
  { userId: '05d16c21-4537-429e-a4ac-f5485ebb4696', name: 'Jeanwentz dolly', email: 'kiaradolly@gmail.com', line1: 'Champin' },
  { userId: '536d4bd5-d746-4179-a662-6230b5edbefb', name: 'Peterson Fleurine', email: 'fleurinepeterson01@gmail.com', line1: 'Cance' },
  { userId: '1e0c8e2c-2e03-485b-af8b-4e9f40a60688', name: 'Ing. Ronex NORTELUS', email: 'nortelusronex4433@gmail.com', line1: 'Cajou' },
  { userId: '7105c0b6-b186-4260-b5c3-618768193076', name: 'samsonbensley', email: 'samsonbensley505@mail.com', line1: 'Bel-Air' },
  { userId: 'd1b84af6-2b69-4f04-8463-13eb9f6020f0', name: 'Dave Angelo Pierre', email: 'daveangelo509@gmail.com', line1: 'PAUP' },
  { userId: '4cc27abf-a98d-4c7a-a20e-d2e330d5a970', name: 'jacques robenson', email: 'bresiliencharlemy@gmail.com', line1: 'Vialet' },
];

async function main() {
  const confirm = process.argv.includes('--confirm');

  const app = await NestFactory.createApplicationContext(NotifyBatchBootstrapModule, { logger: ['error', 'warn'] });
  const mailService = app.get(MailService);

  try {
    console.log('── Rezime ────────────────────────────────────────────────');
    console.log(`  Total destinatè (fiks): ${RECIPIENTS.length}`);
    console.log('── Lis konplè ───────────────────────────────────────────');
    RECIPIENTS.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.name} <${r.email}> — line1="${r.line1}" (${r.line1.length} car.)`);
    });
    console.log('─────────────────────────────────────────────────────────');

    if (!confirm) {
      console.log('\n[DRY-RUN] Pa gen okenn imèl ki voye. Kouri ak --confirm pou egzekite pou tout bon.');
      return;
    }

    console.log('\n[LIVE] Ap voye imèl bay tout kliyan yo...');
    let sent = 0;
    let failed = 0;
    for (const r of RECIPIENTS) {
      try {
        await mailService.sendAddressTooShortNotice(r.email, r.name);
        sent++;
      } catch (err: any) {
        failed++;
        console.error(`  ✗ Echwe pou ${r.email}: ${err?.message ?? err}`);
      }
    }
    console.log(`\n[LIVE] Fini. ${sent} imèl voye, ${failed} echwe (sou ${RECIPIENTS.length} total).`);
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
