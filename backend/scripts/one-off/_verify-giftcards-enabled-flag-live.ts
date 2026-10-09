/**
 * _verify-giftcards-enabled-flag-live.ts
 *
 * Demand Mr. Greffin, 8 oct 2026 — apre deplwaman GIFTCARDS_ENABLED kill
 * switch (kredansyal Reloadly envalid depi 7 oktòb) + mete GIFTCARDS_ENABLED=
 * false sou Render + restart. Verifye (lekti sèlman, pa gen okenn HTTP/JWT
 * nesesè) ke GiftCardsController.getProducts() reyèlman jete
 * ServiceUnavailableException ak mesaj klè a, nan anviwònman Render reyèl la
 * kote env var la ap viv.
 */
import { NestFactory } from '@nestjs/core';
import { GiftCardsModule } from '../../src/giftcards/giftcards.module';
import { GiftCardsController } from '../../src/giftcards/giftcards.controller';

async function main() {
  console.log(`process.env.GIFTCARDS_ENABLED = ${JSON.stringify(process.env.GIFTCARDS_ENABLED)}`);

  const app = await NestFactory.createApplicationContext(GiftCardsModule, { logger: ['error', 'warn'] });
  const controller = app.get(GiftCardsController);

  try {
    await controller.getProducts('US');
    console.log('✗✗✗ PWOBLÈM: getProducts() pa t jete okenn erè — flag la PA aktif.');
  } catch (err: any) {
    console.log(`✓ getProducts() jete: status=${err?.status} message="${err?.message}"`);
  }

  await app.close();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
