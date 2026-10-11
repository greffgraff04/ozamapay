/**
 * _check-yoniegranville-cardkycstatus-raw-detail.ts
 *
 * Demand Mr. Greffin, 9 oct 2026 — pollPendingCardCreations() sèlman stoke
 * `cardkyc status="rejected" (background poll)` nan CardCreationFailure, san
 * rezon detaye a (statusResponse konplè pa janm logué). Mr. Greffin sonje yon
 * mesaj "dataNotReadable" (soti Sumsub, posib bò kote dashboard ZiiroPay) ki
 * ta ka lye ak id_type="passport" hardcode pou TOUT kliyan Ayisyen (idNumber
 * reyèl Granville a se NATIONAL_ID, pa yon paspò — wè strowallet.service.ts
 * L512/678).
 *
 * Script sa a lekti sèlman — rele cardkycstatus (vrè StrowalletService
 * REYÈL, menm jan ak pollPendingCardCreations()) pou Granville, imprime
 * REPONS BRIT KONPLÈ pou wè si "dataNotReadable" oswa yon lòt rezon detaye
 * parèt la.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { StrowalletService } from '../../src/strowallet/strowallet.service';

const EMAIL = 'yoniegranville@gmail.com';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const svc = app.get(StrowalletService) as any;

  try {
    const result = await svc.nfcGet('cardkycstatus', { email: EMAIL });
    console.log('=== cardkycstatus REPONS BRIT KONPLÈ ===');
    console.log(JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.log('✗ Erè pandan apèl la:');
    console.log(err?.strowalletDetail ?? err?.message ?? err);
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
