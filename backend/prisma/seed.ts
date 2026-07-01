import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // ── Rates ────────────────────────────────────────────────────────────────
  // update: {} → pa ekraze valè admin deja mete si seed rekouri sou production
  await prisma.rate.upsert({
    where:  { key: 'USD_HTG' },
    update: {},
    create: { key: 'USD_HTG', value: 135 },
  });

  await prisma.rate.upsert({
    where:  { key: 'CARD_RATE' },
    update: {},
    create: { key: 'CARD_RATE', value: 140 },
  });

  // ── Master User ───────────────────────────────────────────────────────────
  const masterId = process.env.OZAMAPAY_MASTER_ID;
  if (!masterId) {
    console.warn('⚠  OZAMAPAY_MASTER_ID pa defini — skip master user');
    return;
  }

  const hashedPassword = await bcrypt.hash('ChangeMe123!', 10);

  const master = await prisma.user.upsert({
    where:  { id: masterId },
    update: { role: 'SUPER_ADMIN' },   // pa touche modpas kont ki deja egziste
    create: {
      id:            masterId,
      email:         'contact@ozamapay.com',
      password:      hashedPassword,
      name:          'OZAMAPAY Master',
      role:          'SUPER_ADMIN',
      emailVerified: true,
    },
  });

  await prisma.wallet.upsert({
    where:  { userId: master.id },
    update: {},
    create: { userId: master.id, balance: 0 },
  });

  console.log('✅ Seed terminé');
  console.log(`   USD_HTG   = 135`);
  console.log(`   CARD_RATE = 140`);
  console.log(`   Master    : ${master.email} (${master.role})`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
