/**
 * apply-corrected-address.ts
 *
 * Itilize pa admin lè yon kliyan reponn imèl/WhatsApp "adrès twò kout" ak
 * adrès konplè a (wè sendAddressTooShortNotice() ak notify-address-too-
 * short-batch.ts). Rele KycService.applyCorrectedAddress() dirèkteman —
 * si yon CardCreationAddressBlock te egziste pou kont sa a, kreyasyon kat
 * la relanse OTOMATIKMAN, san lòt entèvansyon.
 *
 * Safety: DRY-RUN pa default (montre sèlman done ki pral anvoye). --confirm
 * pou aplike pou tout bon.
 *
 * Kòmand (nan /backend, oswa kòm Render job pou bon sekrè production):
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/apply-corrected-address.ts --email=xxx@gmail.com --line1="123 Rue Exemple, Katye X"            # dry-run
 *   ... --confirm  # live
 *
 * Opsyonèl: --city= --state= --zipCode= --country=
 */

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { StrowalletModule } from '../../src/strowallet/strowallet.module';
import { KycModule } from '../../src/kyc/kyc.module';
import { KycService } from '../../src/kyc/kyc.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { AlertCooldownModule } from '../../src/common/alert-cooldown/alert-cooldown.module';

@Module({ imports: [PrismaModule, AlertCooldownModule, StrowalletModule, KycModule] })
class ApplyAddressBootstrapModule {}

function getArgValue(flag: string): string | null {
  const arg = process.argv.find((a) => a.startsWith(`${flag}=`));
  return arg ? arg.slice(flag.length + 1) : null;
}

async function main() {
  const email = getArgValue('--email');
  const line1 = getArgValue('--line1');
  const confirm = process.argv.includes('--confirm');
  if (!email || !line1) {
    console.error('✗ Mande --email=<email> --line1="<nouvo adrès>"');
    process.exitCode = 1;
    return;
  }

  const app = await NestFactory.createApplicationContext(ApplyAddressBootstrapModule, { logger: ['error', 'warn', 'log'] });
  const prisma = app.get(PrismaService);
  const kycService = app.get(KycService);

  try {
    const user = await prisma.user.findFirst({ where: { email }, include: { kyc: true } });
    if (!user) { console.error(`✗ Pa jwenn itilizatè ak email ${email} — ARÈTE`); return; }

    const dto = {
      line1,
      city: getArgValue('--city') ?? undefined,
      state: getArgValue('--state') ?? undefined,
      zipCode: getArgValue('--zipCode') ?? undefined,
      country: getArgValue('--country') ?? undefined,
    };

    console.log('── Kliyan ────────────────────────────────────────────────');
    console.log(`  ${user.name} (${user.email})`);
    console.log(`  Adrès aktyèl: "${user.kyc?.line1}" → nouvo: "${dto.line1}"`);
    console.log(`  Lòt chan: city=${dto.city ?? '(pa chanje)'} state=${dto.state ?? '(pa chanje)'} zipCode=${dto.zipCode ?? '(pa chanje)'} country=${dto.country ?? '(pa chanje)'}`);

    const pendingBlock = await prisma.cardCreationAddressBlock.findFirst({ where: { userId: user.id, resolvedAt: null } });
    console.log(`  Demand kreyasyon kat an atant: ${pendingBlock ? `WI (context=${pendingBlock.context}, $${pendingBlock.amountUsd})` : 'NON'}`);

    if (!confirm) {
      console.log('\n[DRY-RUN] Pa gen okenn chanjman DB ni apèl StroWallet. Kouri ak --confirm pou aplike pou tout bon.');
      return;
    }

    console.log('\n[LIVE] Aplike koreksyon adrès la...\n');
    const result = await kycService.applyCorrectedAddress(user.id, dto);
    console.log('✓✓✓ REZILTA ✓✓✓');
    console.log(JSON.stringify(result, null, 2));
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
