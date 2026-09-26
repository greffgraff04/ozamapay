/**
 * READ-ONLY. Konte itilizatè ki gen KYC APPROVED (= "verified") ak yon email
 * valid, pou kanpay avis pann tanporè kat Mastercard. Pa voye okenn imel.
 *
 * Egzekite (nan /backend):
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS"}' scripts/one-off/_mastercard-outage-notice-count.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function main() {
  const where = { kyc: { status: 'APPROVED' as const } };

  const total = await prisma.user.count({ where });

  const users = await prisma.user.findMany({
    where,
    select: { id: true, email: true, name: true },
    orderBy: { createdAt: 'asc' },
  });

  const validEmail = users.filter(u => EMAIL_RE.test(u.email));
  const invalidEmail = users.filter(u => !EMAIL_RE.test(u.email));

  console.log(`Total itilizatè KYC APPROVED: ${total}`);
  console.log(`Ak email ki gen fòma valid: ${validEmail.length}`);
  console.log(`Ak email ki SANBLE envalid (${invalidEmail.length}):`);
  invalidEmail.forEach(u => console.log(`  - ${u.email} (id=${u.id})`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
