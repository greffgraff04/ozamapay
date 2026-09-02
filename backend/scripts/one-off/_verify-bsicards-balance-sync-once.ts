/**
 * _verify-bsicards-balance-sync-once.ts
 * Envoke BSICardsBalanceSyncService.syncAllBalances() YON SÈL FWA manyèlman
 * (pa gen --confirm — sa a REYÈLMAN ekri BDD si gen drift, menm jan ak cron
 * la ta fè; se yon tès entegrasyon, pa yon dry-run). Verifye kat Olivier a
 * (drift konfime jodi a: BDD €9.58 vs live €3.13) korije kòrèkteman e
 * imèl alèt la voye.
 */
import { NestFactory } from '@nestjs/core';
import { BSICardsModule } from '../../src/bsicards/bsicards.module';
import { BSICardsBalanceSyncService } from '../../src/bsicards/bsicards-balance-sync.service';
import { PrismaService } from '../../src/prisma/prisma.service';

async function main() {
  const app = await NestFactory.createApplicationContext(BSICardsModule, { logger: ['error', 'warn', 'log'] });
  const prisma = app.get(PrismaService);
  const sync = app.get(BSICardsBalanceSyncService);

  try {
    const before = await prisma.virtualCard.findMany({
      where: { provider: 'BSICARDS_MASTERCARD_EUR', status: { in: ['ACTIVE', 'FROZEN'] } },
      include: { user: { select: { email: true } } },
    });
    console.log('── AVAN ──────────────────────────────────────────────────────');
    for (const c of before) console.log(`  ${c.user.email} | cardId=${c.cardId} | balance=€${c.balance}`);

    console.log('\n[RUNNING] syncAllBalances()...\n');
    await sync.syncAllBalances();

    const after = await prisma.virtualCard.findMany({
      where: { provider: 'BSICARDS_MASTERCARD_EUR', status: { in: ['ACTIVE', 'FROZEN'] } },
      include: { user: { select: { email: true } } },
    });
    console.log('\n── APRE ──────────────────────────────────────────────────────');
    for (const c of after) console.log(`  ${c.user.email} | cardId=${c.cardId} | balance=€${c.balance}`);
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
