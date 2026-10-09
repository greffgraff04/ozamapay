// Creates the staging admin/master user (same account serves both — it's
// matched against OZAMAPAY_MASTER_ID by raw id for MasterGuard, and against
// role for CooGuard, exactly like prisma/seed.ts does for prod).
//
// Refuses to run unless APP_ENV=staging AND DATABASE_URL isn't the prod db
// — this is a destructive-adjacent script (creates a privileged account)
// and must never be runnable against production by accident.
//
// Usage: APP_ENV=staging STAGING_ADMIN_PASSWORD=... npx ts-node scripts/seed-staging.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { isStaging, assertStagingNotUsingProdDatabase } from '../src/config/app-env';

const BCRYPT_ROUNDS = 10;

async function main() {
  if (!isStaging()) {
    console.error('FATAL: APP_ENV dwe = "staging" pou lanse script sa a.');
    process.exit(1);
  }

  try {
    assertStagingNotUsingProdDatabase();
  } catch (err) {
    console.error(`FATAL: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  const password = process.env.STAGING_ADMIN_PASSWORD;
  if (!password) {
    console.error('FATAL: STAGING_ADMIN_PASSWORD pa defini — okenn modpas pa kodifye nan script la.');
    process.exit(1);
  }

  const email = process.env.STAGING_ADMIN_EMAIL || 'staging-admin@ozamapay.com';

  const prisma = new PrismaClient();
  try {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Upsert on email (unique), not id — id doesn't exist yet on a fresh
    // staging DB, so re-running this script stays idempotent on email
    // instead of creating a duplicate admin each time.
    const admin = await prisma.user.upsert({
      where: { email },
      update: { role: 'SUPER_ADMIN' }, // never touch password on an existing account
      create: {
        id: randomUUID(),
        email,
        password: hashedPassword,
        name: 'OZAMAPAY Staging Admin',
        role: 'SUPER_ADMIN',
        emailVerified: true,
      },
    });

    await prisma.wallet.upsert({
      where: { userId: admin.id },
      update: {},
      create: { userId: admin.id, balance: 0 },
    });

    console.log('✅ Admin/master staging kreye (oswa deja egziste).');
    console.log(`   Email : ${admin.email}`);
    console.log(`   Role  : ${admin.role}`);
    console.log('');
    console.log(`   OZAMAPAY_MASTER_ID=${admin.id}`);
    console.log('   ↑ mete valè sa a nan env vars Render staging.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
