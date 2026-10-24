/**
 * Verifye sou STAGING sèlman: getMyCards() retounen dènye kat kreye a an
 * premye (desc) apre fix 88ac808. Kreye yon itilizatè + 2 VirtualCard
 * tanporè (yon BSICARDS_MASTERCARD_EUR pi ansyen, yon STROWALLET_NFC pi
 * nouvo — menm senaryo ak Elisabeth), rele CardsService.getMyCards()
 * dirèkteman, verifye lòd la, epi netwaye tout done tès yo apre.
 *
 * REFIZE kouri si APP_ENV !== 'staging' — script sa a kreye yon fo
 * itilizatè, li pa dwe janm touche pwodiksyon.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { CardsService } from '../../src/cards/cards.service';
import { PrismaService } from '../../src/prisma/prisma.service';

async function main() {
  if (process.env.APP_ENV !== 'staging') {
    console.error('✗ APP_ENV !== staging — script sa a REFIZE kouri si se pa STAGING. ARÈTE.');
    process.exit(0);
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);
  const cardsService = app.get(CardsService);

  const testEmail = `_test-order-verify-${Date.now()}@staging.local`;
  let userId: string | undefined;

  try {
    const user = await prisma.user.create({
      data: { email: testEmail, password: 'x', name: 'Test Order Verify' },
    });
    userId = user.id;

    const older = await prisma.virtualCard.create({
      data: {
        userId,
        cardId: `test-eur-${Date.now()}`,
        provider: 'BSICARDS_MASTERCARD_EUR',
        status: 'ACTIVE',
        balance: 5,
        createdAt: new Date(Date.now() - 60_000),
      },
    });
    const newer = await prisma.virtualCard.create({
      data: {
        userId,
        cardId: `test-visa-${Date.now()}`,
        provider: 'STROWALLET_NFC',
        status: 'ACTIVE',
        balance: 3,
        createdAt: new Date(),
      },
    });

    const result = await cardsService.getMyCards(userId);
    console.log('Rezilta getMyCards() (lòd retounen):');
    for (const c of result as any[]) {
      console.log(`  provider=${c.provider} cardId=${c.cardId} createdAt=${c.createdAt}`);
    }

    const firstIsNewer = (result as any[])[0]?.cardId === newer.cardId;
    const secondIsOlder = (result as any[])[1]?.cardId === older.cardId;
    console.log(`\n✓ Premye eleman se kat PI NOUVO: ${firstIsNewer}`);
    console.log(`✓ Dezyèm eleman se kat PI ANSYEN: ${secondIsOlder}`);
    console.log(firstIsNewer && secondIsOlder ? '\n✓✓✓ DESC KONFIME ✓✓✓' : '\n✗✗✗ LÒD PA KORÈK ✗✗✗');
  } finally {
    if (userId) {
      await prisma.virtualCard.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
      console.log('\n✓ Netwayaj fèt — itilizatè/kat tès yo efase.');
    }
    await app.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(0);
  });
