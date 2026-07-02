/**
 * seed-accounts.ts
 * Kreye 5 kont (User + Wallet + KYC APPROVED + VirtualCard) dirèkteman via Prisma.
 *
 * AVÈTISMAN: Olivier Greffin gen 2 kat, men VirtualCard.userId se @unique nan schema a.
 * Sèlman premye kat la ap kreye. Dezyèm kat a ap rapòte kòm BLOKE.
 * Si ou vle 2 kat, ou bezwen yon migrasyon Prisma pou retire @unique sou userId.
 *
 * Kòmand pou egzekite (nan /backend):
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS"}' scripts/seed-accounts.ts
 */

import { PrismaClient, CardStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface CardSeed {
  cardId: string;
  balance: number;
}

interface AccountSeed {
  email: string;
  name: string;
  password: string;
  cards: CardSeed[];
}

const accounts: AccountSeed[] = [
  {
    email: 'jubelcky.prophete2003@gmail.com',
    name: 'Jubelcky Prophete',
    password: 'Ozama@2026!',
    cards: [{ cardId: '019ec226-4b7b-70c3-be9a-c42fdec4a20e', balance: 30.00 }],
  },
  {
    email: 'taichapierre537@gmail.com',
    name: 'Taicha Pierre',
    password: 'Ozama@2026!',
    cards: [{ cardId: '019f06e3-0d7c-7021-8e60-b77def7435f5', balance: 3.00 }],
  },
  {
    email: 'fingerovilmar92@gmail.com',
    name: 'Fingero Vilmar',
    password: 'Ozama@2026!',
    cards: [{ cardId: '019ee6c2-2dd4-742c-9b78-43ad38e4ef31', balance: 3.00 }],
  },
  {
    email: 'oliviergreffin20@gmail.com',
    name: 'Olivier Greffin',
    password: 'Ozama@2026!',
    cards: [
      { cardId: 'a06edd0a-2cd6-4982-a74a-5675b489fbc2', balance: 3.00 },
      { cardId: 'b063e28a-9bd2-4dbc-af90-1ce7817c18a6', balance: 0.20 },
    ],
  },
  {
    email: 'amanda@ozama.com',
    name: 'Amanda',
    password: 'Ozama@2026!',
    cards: [{ cardId: '019ec220-f25e-7273-8748-16ab580f6cec', balance: 1.21 }],
  },
];

type Status = '✓' | '⚠' | '✗';

interface StepResult {
  label: string;
  status: Status;
  detail: string;
}

async function processAccount(acc: AccountSeed): Promise<StepResult[]> {
  const results: StepResult[] = [];
  const nameParts = acc.name.trim().split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ') || 'USER';

  // ── STEP 1: User + Wallet ──────────────────────────────────────────────────
  let userId: string;

  const existing = await prisma.user.findUnique({
    where: { email: acc.email.toLowerCase() },
  });

  if (existing) {
    userId = existing.id;
    results.push({ label: 'User', status: '⚠', detail: `Deja egziste (id: ${userId})` });
  } else {
    try {
      const hashed = await bcrypt.hash(acc.password, 10);
      const newUser = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            email: acc.email.toLowerCase(),
            password: hashed,
            name: acc.name,
            role: 'USER',
          },
        });
        await tx.wallet.create({ data: { userId: u.id, balance: 0 } });
        return u;
      });
      userId = newUser.id;
      results.push({ label: 'User + Wallet', status: '✓', detail: `Kreye (id: ${userId})` });
    } catch (e: any) {
      results.push({ label: 'User + Wallet', status: '✗', detail: e.message });
      return results;
    }
  }

  // ── STEP 2: KYC → APPROVED ─────────────────────────────────────────────────
  try {
    const existingKyc = await prisma.kyc.findUnique({ where: { userId } });
    if (existingKyc) {
      await prisma.kyc.update({
        where: { userId },
        data: { status: 'APPROVED', reviewedAt: new Date() },
      });
      results.push({ label: 'KYC', status: '⚠', detail: 'Deja la → mis à jour APPROVED' });
    } else {
      await prisma.kyc.create({
        data: {
          userId,
          firstName,
          lastName,
          dateOfBirth: new Date('1990-01-01'),
          phoneNumber: '50900000000',
          idType: 'national_id',
          idNumber: 'STROWALLET-VERIFIED',
          idImage: 'strowallet-verified',
          userPhoto: 'strowallet-verified',
          line1: 'Haiti',
          city: 'Port-au-Prince',
          state: 'Ouest',
          zipCode: 'HT6110',
          country: 'HT',
          status: 'APPROVED',
          reviewedAt: new Date(),
        },
      });
      results.push({ label: 'KYC', status: '✓', detail: 'Kreye → APPROVED' });
    }
  } catch (e: any) {
    results.push({ label: 'KYC', status: '✗', detail: e.message });
  }

  // ── STEP 3: VirtualCard(s) ─────────────────────────────────────────────────
  for (const card of acc.cards) {
    // Tcheke si kat sa a deja nan DB (pa cardId)
    const byCardId = await prisma.virtualCard.findUnique({
      where: { cardId: card.cardId },
    });
    if (byCardId) {
      results.push({
        label: `VirtualCard ${card.cardId.slice(0, 8)}…`,
        status: '⚠',
        detail: 'cardId deja nan DB — skip',
      });
      continue;
    }

    // Tcheke si itilizatè deja gen yon kat ak menm cardId
    const byUserId = await prisma.virtualCard.findFirst({ where: { userId } });
    if (byUserId) {
      results.push({
        label: `VirtualCard ${card.cardId.slice(0, 8)}… ($${card.balance})`,
        status: '⚠',
        detail: `Itilizatè deja gen kat ${byUserId.cardId.slice(0, 8)}… — ap kreye yon dezyèm kat.`,
      });
    }

    try {
      await prisma.virtualCard.create({
        data: {
          userId,
          cardId: card.cardId,
          balance: card.balance,
          currency: 'USD',
          provider: 'STROWALLET_NFC',
          status: CardStatus.ACTIVE,
        },
      });
      results.push({
        label: `VirtualCard ${card.cardId.slice(0, 8)}…`,
        status: '✓',
        detail: `Kreye — $${card.balance} USD`,
      });
    } catch (e: any) {
      results.push({
        label: `VirtualCard ${card.cardId.slice(0, 8)}…`,
        status: '✗',
        detail: e.message,
      });
    }
  }

  return results;
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║         OZAMAPAY — Seed 5 Kont + VirtualCards        ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  for (const acc of accounts) {
    console.log(`┌─ ${acc.name} <${acc.email}>`);
    const steps = await processAccount(acc);
    for (const s of steps) {
      console.log(`│  ${s.status}  [${s.label}] ${s.detail}`);
    }
    console.log('└─────────────────────────────────────────────────────\n');
  }

  // ── Rezime final ────────────────────────────────────────────────────────────
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  AVÈTISMAN: Olivier Greffin gen 2 kat               ║');
  console.log('║  Dezyèm kat (b063e28a, $0.20) pa ka kreye paske     ║');
  console.log('║  VirtualCard.userId se @unique (1 kat / itilizatè). ║');
  console.log('║                                                      ║');
  console.log('║  Pou fikse: kouri migrasyon ki retire @unique        ║');
  console.log('║  sou VirtualCard.userId epi chanje relasyon an      ║');
  console.log('║  User → virtualCards VirtualCard[]                  ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
}

main()
  .catch((e) => { console.error('FATAL:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
