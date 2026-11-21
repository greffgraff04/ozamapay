// E2E staging — renaissance pricing (KYC gratis, kat 1500 HTG, kado fondatè,
// komisyon 1e kat). Doit tourner UNIQUEMENT dans le conteneur
// ozamapay-backend-staging (APP_ENV=staging). Ne jamais imprimer de secret.
//
// Sénario 7 (échec fournisseur) a besoin d'un taux d'échec mock à 100%, qui
// est lu une seule fois au chargement du module provider-mock.ts — donc dans
// un process SÉPARÉ, lancé avec STAGING_MOCK_FAILURE_RATE=1 et le flag
// --scenario7-only. Voir les 2 commandes dans le rapport livré à l'utilisateur.

if (process.env.APP_ENV !== 'staging') {
  console.error('ARÈT IMMEDYAT: APP_ENV !== "staging" — script refize kouri.');
  process.exit(1);
}

import { NestFactory } from '@nestjs/core';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from '../../src/app.module';
import { assertStagingNotUsingProdDatabase } from '../../src/config/app-env';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuthService } from '../../src/auth/auth.service';
import { KycService } from '../../src/kyc/kyc.service';
import { AdminService } from '../../src/admin/admin.service';
import { AgentsService } from '../../src/agents/agents.service';
import { StrowalletService } from '../../src/strowallet/strowallet.service';
import { PricingService } from '../../src/pricing/pricing.service';

assertStagingNotUsingProdDatabase();

const RESULTS_FILE = path.join(__dirname, '.renaissance-e2e-results.json');
const PLACEHOLDER_IMAGE_URL = 'https://www.google.com/favicon.ico';
const TEST_PASSWORD = 'TestRenaissance123!';
const SCENARIO7_ONLY = process.argv.includes('--scenario7-only');

type Row = {
  scenario: string;
  attendu: string;
  obtenu: string;
  ok: boolean;
  montants: string;
};

function loadResults(): Row[] {
  try {
    return JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveResults(rows: Row[]) {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(rows, null, 2));
}

function printReport(rows: Row[], accounts: string[]) {
  console.log('\n=== RAPPORT E2E — RENAISSANCE PRICING (STAGING) ===\n');
  for (const r of rows) {
    console.log(`[${r.ok ? 'OK' : 'KO'}] ${r.scenario}`);
    console.log(`  Attendu : ${r.attendu}`);
    console.log(`  Obtenu  : ${r.obtenu}`);
    console.log(`  Montants: ${r.montants}`);
    console.log('');
  }
  console.log('=== COMPTES DE TEST CRÉÉS (pour nettoyage ultérieur) ===\n');
  for (const a of accounts) console.log(`  - ${a}`);
  console.log('');
}

async function getOrCreateUser(
  prisma: PrismaService,
  authService: AuthService,
  email: string,
  name: string,
  agentCode?: string,
) {
  let user = await prisma.user.findUnique({
    where: { email },
    include: { wallet: true, kyc: true, agent: true },
  });
  if (user) return user;
  await authService.register({
    email,
    name,
    password: TEST_PASSWORD,
    agentCode,
  });
  user = await prisma.user.findUnique({
    where: { email },
    include: { wallet: true, kyc: true, agent: true },
  });
  if (!user) throw new Error(`Echèk kreyasyon itilizatè ${email}`);
  return user;
}

async function ensureKycSubmitted(
  kycService: KycService,
  prisma: PrismaService,
  userId: string,
  idSuffix: string,
) {
  let kyc = await prisma.kyc.findUnique({ where: { userId } });
  if (kyc) return kyc;
  await kycService.submitKyc(userId, {
    firstName: 'Test',
    lastName: 'Renaissance',
    dateOfBirth: '1990-01-01',
    phoneNumber: `509000${idSuffix}`,
    idType: 'passport',
    idNumber: `TESTID-${idSuffix}`,
    idImage: PLACEHOLDER_IMAGE_URL,
    userPhoto: PLACEHOLDER_IMAGE_URL,
    line1: '123 Test Staging Street',
    city: 'Port-au-Prince',
    state: 'Ouest',
    zipCode: 'HT1234',
    country: 'Haiti',
  } as any);
  kyc = await prisma.kyc.findUnique({ where: { userId } });
  if (!kyc) throw new Error(`Echèk soumisyon KYC pou userId=${userId}`);
  return kyc;
}

async function ensureKycApproved(
  adminService: AdminService,
  prisma: PrismaService,
  userId: string,
) {
  let kyc = await prisma.kyc.findUnique({ where: { userId } });
  if (!kyc) throw new Error(`Pa gen KYC soumèt pou userId=${userId}`);
  if (kyc.status === 'APPROVED') return kyc;
  // 'ADMIN-SYS' se sentinel egzak admin.service.ts reviewKyc() tcheke pou
  // ranplase l ak yon vrè User.id (FK obligatwa sou AdminActionLog.adminId)
  // — nenpòt lòt string ta fè tranzaksyon an echwe sou yon vyolasyon FK.
  await adminService.reviewKyc(kyc.id, 'APPROVED', 'ADMIN-SYS');
  kyc = await prisma.kyc.findUnique({ where: { userId } });
  return kyc!;
}

async function ensureWalletAtLeast(
  prisma: PrismaService,
  userId: string,
  walletId: string,
  targetHtg: number,
) {
  const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
  const current = Number(wallet!.balance);
  if (current >= targetHtg) return current;
  const topUp = targetHtg - current;
  await prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { id: walletId },
      data: { balance: { increment: topUp } },
    });
    const tx1 = await tx.transaction.create({
      data: {
        receiverWalletId: walletId,
        type: 'TOPUP',
        status: 'COMPLETED',
        amount: topUp,
        netAmount: topUp,
        fee: 0,
        title: 'TEST STAGING',
        description: `Finansman wallet tès E2E renaissance pricing (+${topUp} HTG pou rive ${targetHtg} HTG)`,
        reference: `TEST-STAGING-FUND-${userId}-${Date.now()}`,
      },
    });
    await tx.ledgerEntry.create({
      data: {
        walletId,
        transactionId: tx1.id,
        type: 'CREDIT',
        amount: topUp,
        balanceBefore: current,
        balanceAfter: targetHtg,
        description: 'TEST STAGING',
      },
    });
  });
  return targetHtg;
}

async function getActiveStrowalletCard(prisma: PrismaService, userId: string) {
  return prisma.virtualCard.findFirst({
    where: {
      userId,
      provider: 'STROWALLET_NFC',
      status: { in: ['ACTIVE', 'FROZEN', 'PENDING_RECHARGE'] },
    },
  });
}

async function terminateCardForTest(prisma: PrismaService, cardId: string) {
  // Simule une terminaison (normalement via CardTerminationService) pour
  // pouvoir tester la création d'une 2e carte sans attendre le vrai cycle
  // de terminaison — légitime ici car c'est un script de test E2E.
  await prisma.virtualCard.update({
    where: { id: cardId },
    data: { status: 'TERMINATED', terminatedAt: new Date() },
  });
}

async function scenario1_kycGratuit(
  prisma: PrismaService,
  authService: AuthService,
  kycService: KycService,
  adminService: AdminService,
  accounts: string[],
) {
  const email = 'test-renaissance-01@ozamapay-staging.test';
  accounts.push(email);
  const user = await getOrCreateUser(
    prisma,
    authService,
    email,
    'Test Renaissance 01',
  );
  await ensureKycSubmitted(kycService, prisma, user.id, '01');

  const walletBefore = await prisma.wallet.findUnique({
    where: { userId: user.id },
  });
  const txCountBefore = await prisma.transaction.count({
    where: { title: 'Frè KYC', senderWalletId: walletBefore!.id },
  });
  const commissionCountBefore = await prisma.commission.count({
    where: { type: 'KYC' },
  });

  const kycBefore = await prisma.kyc.findUnique({ where: { userId: user.id } });
  const alreadyApproved = kycBefore?.status === 'APPROVED';
  await ensureKycApproved(adminService, prisma, user.id);

  const walletAfter = await prisma.wallet.findUnique({
    where: { userId: user.id },
  });
  const txCountAfter = await prisma.transaction.count({
    where: { title: 'Frè KYC', senderWalletId: walletBefore!.id },
  });
  const commissionCountAfter = await prisma.commission.count({
    where: { type: 'KYC' },
  });

  const balanceUnchanged =
    Number(walletBefore!.balance) === Number(walletAfter!.balance);
  const noFeeTx = txCountAfter === txCountBefore;
  const noNewCommission = commissionCountAfter === commissionCountBefore;

  return {
    scenario: '1. KYC gratuit (nouvel utilisateur → soumis → approuvé)',
    attendu:
      'wallet NON débité, aucune Transaction "Frè KYC", aucune Commission KYC créée',
    obtenu: `balance ${walletBefore!.balance} HTG → ${walletAfter!.balance} HTG (${balanceUnchanged ? 'inchangée' : 'CHANGÉE'}); Transaction "Frè KYC" count ${txCountBefore}→${txCountAfter}; Commission KYC count ${commissionCountBefore}→${commissionCountAfter}${alreadyApproved ? " [KYC déjà approuvé lors d'un run précédent — état relu]" : ''}`,
    ok: balanceUnchanged && noFeeTx && noNewCommission,
    montants: `balance: ${walletBefore!.balance} HTG (inchangée)`,
  };
}

async function scenario2_carte3usd(
  prisma: PrismaService,
  authService: AuthService,
  kycService: KycService,
  adminService: AdminService,
  strowalletService: StrowalletService,
) {
  const email = 'test-renaissance-01@ozamapay-staging.test'; // réutilise l'utilisateur du scénario 1
  const user = await getOrCreateUser(
    prisma,
    authService,
    email,
    'Test Renaissance 01',
  );
  await ensureKycSubmitted(kycService, prisma, user.id, '01');
  await ensureKycApproved(adminService, prisma, user.id);
  await ensureWalletAtLeast(prisma, user.id, user.wallet!.id, 2000);

  const existingCard = await getActiveStrowalletCard(prisma, user.id);
  let balanceBefore = Number(
    (await prisma.wallet.findUnique({ where: { userId: user.id } }))!.balance,
  );
  let card = existingCard;
  let reused = false;

  if (!card) {
    balanceBefore = Number(
      (await prisma.wallet.findUnique({ where: { userId: user.id } }))!.balance,
    );
    await strowalletService.createAndFundCard(user.id, 3);
    card = await getActiveStrowalletCard(prisma, user.id);
  } else {
    reused = true;
  }

  const balanceAfter = Number(
    (await prisma.wallet.findUnique({ where: { userId: user.id } }))!.balance,
  );
  const feeTx = await prisma.transaction.findFirst({
    where: { senderWalletId: user.wallet!.id, title: 'Frè kreyasyon kat' },
    orderBy: { createdAt: 'desc' },
  });

  const delta = reused ? null : balanceBefore - balanceAfter;
  const cardIs3 = Number(card?.balance) === 3;
  const feeIs1500 = Number(feeTx?.amount) === 1500;
  const ok = reused
    ? cardIs3 && feeIs1500
    : delta === 1500 && cardIs3 && feeIs1500;

  return {
    scenario: '2. Carte à 3$ (sans recharge)',
    attendu:
      'débit exact 1500 HTG, carte créée avec $3, Transaction "Frè kreyasyon kat" présente (1500 HTG)',
    obtenu: reused
      ? `carte déjà créée lors d'un run précédent — balance carte: $${card?.balance}, Transaction "Frè kreyasyon kat": ${feeTx?.amount} HTG`
      : `débit réel: ${delta} HTG, balance carte: $${card?.balance}, Transaction "Frè kreyasyon kat": ${feeTx?.amount} HTG`,
    ok,
    montants: `1500 HTG (frais fixe) — carte $3`,
  };
}

async function scenario3_carte10usd(
  prisma: PrismaService,
  authService: AuthService,
  kycService: KycService,
  adminService: AdminService,
  strowalletService: StrowalletService,
) {
  const email = 'test-renaissance-02@ozamapay-staging.test';
  const user = await getOrCreateUser(
    prisma,
    authService,
    email,
    'Test Renaissance 02',
  );
  await ensureKycSubmitted(kycService, prisma, user.id, '02');
  await ensureKycApproved(adminService, prisma, user.id);

  const rate = await prisma.rate.findUnique({ where: { key: 'USD_HTG' } });
  const rateValue = Number(rate?.value ?? 135);
  const topUpHtgExpected = Math.ceil(7 * rateValue);
  const expectedTotal = 1500 + topUpHtgExpected;

  await ensureWalletAtLeast(
    prisma,
    user.id,
    user.wallet!.id,
    expectedTotal + 500,
  );

  const existingCard = await getActiveStrowalletCard(prisma, user.id);
  let balanceBefore = Number(
    (await prisma.wallet.findUnique({ where: { userId: user.id } }))!.balance,
  );
  let card = existingCard;
  let reused = false;

  if (!card) {
    balanceBefore = Number(
      (await prisma.wallet.findUnique({ where: { userId: user.id } }))!.balance,
    );
    await strowalletService.createAndFundCard(user.id, 10);
    card = await getActiveStrowalletCard(prisma, user.id);
  } else {
    reused = true;
  }

  const balanceAfter = Number(
    (await prisma.wallet.findUnique({ where: { userId: user.id } }))!.balance,
  );
  const feeTx = await prisma.transaction.findFirst({
    where: { senderWalletId: user.wallet!.id, title: 'Frè kreyasyon kat' },
    orderBy: { createdAt: 'desc' },
  });
  const topUpTx = await prisma.transaction.findFirst({
    where: {
      senderWalletId: user.wallet!.id,
      title: 'Rechaj kat lè kreyasyon',
    },
    orderBy: { createdAt: 'desc' },
  });

  const delta = reused ? null : balanceBefore - balanceAfter;
  const cardIs10 = Number(card?.balance) === 10;
  const ok = reused
    ? cardIs10 &&
      Number(feeTx?.amount) === 1500 &&
      Number(topUpTx?.amount) === topUpHtgExpected
    : delta === expectedTotal &&
      cardIs10 &&
      Number(feeTx?.amount) === 1500 &&
      Number(topUpTx?.amount) === topUpHtgExpected;

  return {
    scenario: '3. Carte à 10$ (avec recharge)',
    attendu: `débit = 1500 + (10-3)×taux USD_HTG = 1500 + 7×${rateValue} = ${expectedTotal} HTG`,
    obtenu: reused
      ? `carte déjà créée lors d'un run précédent — balance carte: $${card?.balance}, frais: ${feeTx?.amount} HTG, recharge: ${topUpTx?.amount} HTG`
      : `débit réel: ${delta} HTG, balance carte: $${card?.balance}, frais: ${feeTx?.amount} HTG, recharge: ${topUpTx?.amount} HTG`,
    ok,
    montants: `calcul: 1500 + ceil(7 × ${rateValue}) = 1500 + ${topUpHtgExpected} = ${expectedTotal} HTG`,
  };
}

async function scenario4_soldeInsuffisant(
  prisma: PrismaService,
  authService: AuthService,
  kycService: KycService,
  adminService: AdminService,
  strowalletService: StrowalletService,
) {
  const email = 'test-renaissance-03@ozamapay-staging.test';
  const user = await getOrCreateUser(
    prisma,
    authService,
    email,
    'Test Renaissance 03',
  );
  await ensureKycSubmitted(kycService, prisma, user.id, '03');
  await ensureKycApproved(adminService, prisma, user.id);
  await ensureWalletAtLeast(prisma, user.id, user.wallet!.id, 1000);

  const existingCard = await getActiveStrowalletCard(prisma, user.id);
  if (existingCard) {
    return {
      scenario: '4. Solde insuffisant (1000 HTG, carte à $3 = 1500 HTG requis)',
      attendu: 'commande refusée, aucun débit',
      obtenu: `ANORMAL: une carte existe déjà pour cet utilisateur (run précédent?) — scénario non concluant`,
      ok: false,
      montants: `balance 1000 HTG < 1500 HTG requis`,
    };
  }

  const balanceBefore = Number(
    (await prisma.wallet.findUnique({ where: { userId: user.id } }))!.balance,
  );
  let threw = false;
  let errorMessage = '';
  try {
    await strowalletService.createAndFundCard(user.id, 3);
  } catch (err: any) {
    threw = true;
    errorMessage = err?.message ?? String(err);
  }
  const balanceAfter = Number(
    (await prisma.wallet.findUnique({ where: { userId: user.id } }))!.balance,
  );
  const balanceUnchanged = balanceBefore === balanceAfter;

  return {
    scenario: '4. Solde insuffisant (1000 HTG, carte à $3 = 1500 HTG requis)',
    attendu: 'commande refusée, aucun débit',
    obtenu: `rejet: ${threw} ("${errorMessage}"), balance ${balanceBefore}→${balanceAfter} HTG (${balanceUnchanged ? 'inchangée' : 'CHANGÉE'})`,
    ok: threw && balanceUnchanged,
    montants: `balance 1000 HTG, requis 1500 HTG, manque 500 HTG`,
  };
}

async function scenario5_membreFondateur(
  prisma: PrismaService,
  authService: AuthService,
  kycService: KycService,
  adminService: AdminService,
  strowalletService: StrowalletService,
  pricingService: PricingService,
) {
  const email = 'test-renaissance-04@ozamapay-staging.test';
  const user = await getOrCreateUser(
    prisma,
    authService,
    email,
    'Test Renaissance 04',
  );
  await ensureKycSubmitted(kycService, prisma, user.id, '04');
  await ensureKycApproved(adminService, prisma, user.id);

  const walletId = user.wallet!.id;
  let historicalKycTx = await prisma.transaction.findFirst({
    where: { title: 'Frè KYC', senderWalletId: walletId },
  });
  if (!historicalKycTx) {
    historicalKycTx = await prisma.transaction.create({
      data: {
        senderWalletId: walletId,
        type: 'PAYMENT',
        status: 'COMPLETED',
        amount: 3375,
        netAmount: 3375,
        fee: 0,
        title: 'Frè KYC',
        description:
          '[SEED TEST] Ancien KYC payé avant bascule renaissance pricing (simulé pour scénario fondateur)',
        reference: `TEST-STAGING-SEED-OLD-KYC-${user.id}`,
      },
    });
  }

  const existingCard = await getActiveStrowalletCard(prisma, user.id);
  const anyCardEverBefore = await prisma.virtualCard.findFirst({
    where: { userId: user.id },
  });

  let firstCardResult: { ok: boolean; obtenu: string };
  if (!anyCardEverBefore) {
    const pricing = await pricingService.getPricing(user.id);
    const founderEligible = pricing.isFounderFreeCard === true;

    const balanceBefore = Number(
      (await prisma.wallet.findUnique({ where: { id: walletId } }))!.balance,
    );
    await strowalletService.createAndFundCard(user.id, 3);
    const balanceAfter = Number(
      (await prisma.wallet.findUnique({ where: { id: walletId } }))!.balance,
    );
    const card = await getActiveStrowalletCard(prisma, user.id);

    const debitIsZero = balanceBefore === balanceAfter;
    const isFounderCard = card?.isFounderFreeCard === true;
    const cardIs3 = Number(card?.balance) === 3;

    firstCardResult = {
      ok: founderEligible && debitIsZero && isFounderCard && cardIs3,
      obtenu: `GET /pricing isFounderFreeCard=${pricing.isFounderFreeCard}; débit réel: ${balanceBefore - balanceAfter} HTG; VirtualCard.isFounderFreeCard=${card?.isFounderFreeCard}; balance carte $${card?.balance}`,
    };
  } else {
    firstCardResult = {
      ok: anyCardEverBefore.isFounderFreeCard === true,
      obtenu: `1ère carte déjà créée lors d'un run précédent — isFounderFreeCard=${anyCardEverBefore.isFounderFreeCard}, balance $${anyCardEverBefore.balance}`,
    };
  }

  // 2e carte — on simule la fin du cycle de vie de la 1ère carte (terminaison)
  // pour pouvoir tester que la 2e carte de ce même client paie normalement.
  const cardAfterFirst = await prisma.virtualCard.findFirst({
    where: { userId: user.id, provider: 'STROWALLET_NFC' },
    orderBy: { createdAt: 'asc' },
  });
  let secondCardResult: { ok: boolean; obtenu: string };
  const secondCardAlready = await prisma.virtualCard.count({
    where: { userId: user.id, provider: 'STROWALLET_NFC' },
  });

  if (
    secondCardAlready < 2 &&
    cardAfterFirst &&
    cardAfterFirst.status !== 'TERMINATED'
  ) {
    await terminateCardForTest(prisma, cardAfterFirst.id);
  }

  const activeCardNow = await getActiveStrowalletCard(prisma, user.id);
  if (!activeCardNow) {
    await ensureWalletAtLeast(prisma, user.id, walletId, 2000);
    const balanceBefore2 = Number(
      (await prisma.wallet.findUnique({ where: { id: walletId } }))!.balance,
    );
    await strowalletService.createAndFundCard(user.id, 3);
    const balanceAfter2 = Number(
      (await prisma.wallet.findUnique({ where: { id: walletId } }))!.balance,
    );
    const card2 = await getActiveStrowalletCard(prisma, user.id);
    const debit2 = balanceBefore2 - balanceAfter2;
    secondCardResult = {
      ok: debit2 === 1500 && card2?.isFounderFreeCard === false,
      obtenu: `débit réel: ${debit2} HTG (attendu 1500), VirtualCard.isFounderFreeCard=${card2?.isFounderFreeCard}`,
    };
  } else {
    secondCardResult = {
      ok: false,
      obtenu:
        'carte active déjà présente, impossible de rejouer le test de 2e carte sans doublon',
    };
  }

  return [
    {
      scenario: '5a. Membre fondateur — 1ère carte (ancien KYC payé, 0 carte)',
      attendu:
        'GET /pricing isFounderFreeCard=true ; carte créée GRATUITEMENT ($3, débit 0 HTG, isFounderFreeCard=true)',
      obtenu: firstCardResult.obtenu,
      ok: firstCardResult.ok,
      montants: 'débit attendu: 0 HTG (OZAMAPAY offre $3)',
    },
    {
      scenario:
        '5b. Membre fondateur — 2e carte (après terminaison simulée de la 1ère)',
      attendu:
        "paie normalement 1500 HTG, isFounderFreeCard=false (le cadeau ne vaut qu'une fois)",
      obtenu: secondCardResult.obtenu,
      ok: secondCardResult.ok,
      montants: 'débit attendu: 1500 HTG',
    },
  ];
}

async function scenario6_commissionAgent(
  prisma: PrismaService,
  authService: AuthService,
  kycService: KycService,
  adminService: AdminService,
  agentsService: AgentsService,
  strowalletService: StrowalletService,
) {
  const agentEmail = 'test-renaissance-agent@ozamapay-staging.test';
  const agentUser = await getOrCreateUser(
    prisma,
    authService,
    agentEmail,
    'Test Renaissance Agent',
  );
  await ensureKycSubmitted(kycService, prisma, agentUser.id, 'AGT');
  await ensureKycApproved(adminService, prisma, agentUser.id);

  let agent = await prisma.agent.findUnique({
    where: { userId: agentUser.id },
  });
  if (!agent) {
    agent = await agentsService.applyAsAgent(
      agentUser.id,
      'Test Renaissance Business',
    );
  }
  if (agent.status !== 'ACTIVE') {
    await adminService.activateAgent(agent.id);
    agent = await prisma.agent.findUnique({ where: { userId: agentUser.id } });
  }
  const agentCode = agent!.agentCode;
  const agentWalletBefore = await prisma.agentWallet.findUnique({
    where: { agentId: agent!.id },
  });

  // Client référé — carte payante (pas fondateur)
  const clientEmail = 'test-renaissance-05@ozamapay-staging.test';
  const client = await getOrCreateUser(
    prisma,
    authService,
    clientEmail,
    'Test Renaissance 05',
    agentCode,
  );
  await ensureKycSubmitted(kycService, prisma, client.id, '05');
  await ensureKycApproved(adminService, prisma, client.id);
  await ensureWalletAtLeast(prisma, client.id, client.wallet!.id, 2000);

  const clientRefreshed = await prisma.user.findUnique({
    where: { id: client.id },
  });
  const referralLinked = clientRefreshed?.referredByAgentId === agent!.id;

  const commissionBefore = await prisma.commission.count({
    where: { agentId: agent!.id, type: 'FIRST_CARD' },
  });
  const existingClientCard = await getActiveStrowalletCard(prisma, client.id);
  if (!existingClientCard) {
    await strowalletService.createAndFundCard(client.id, 3);
  }
  const commissionAfterFirst = await prisma.commission.findFirst({
    where: { agentId: agent!.id, userId: client.id, type: 'FIRST_CARD' },
  });
  const agentWalletAfterFirst = await prisma.agentWallet.findUnique({
    where: { agentId: agent!.id },
  });
  const first200Credited =
    commissionAfterFirst?.amount != null &&
    Number(commissionAfterFirst.amount) === 200 &&
    Number(agentWalletAfterFirst!.balance) -
      Number(agentWalletBefore!.balance) >=
      200;

  // 2e carte du même client → aucune nouvelle commission
  const firstClientCard = await prisma.virtualCard.findFirst({
    where: { userId: client.id, provider: 'STROWALLET_NFC' },
    orderBy: { createdAt: 'asc' },
  });
  const clientCardCount = await prisma.virtualCard.count({
    where: { userId: client.id, provider: 'STROWALLET_NFC' },
  });
  let secondCardNoCommission = { ok: false, obtenu: 'non exécuté' };
  if (
    firstClientCard &&
    firstClientCard.status !== 'TERMINATED' &&
    clientCardCount < 2
  ) {
    await terminateCardForTest(prisma, firstClientCard.id);
  }
  const clientActiveCard = await getActiveStrowalletCard(prisma, client.id);
  if (!clientActiveCard) {
    await ensureWalletAtLeast(prisma, client.id, client.wallet!.id, 2000);
    await strowalletService.createAndFundCard(client.id, 3);
    const commissionCountAfterSecond = await prisma.commission.count({
      where: { agentId: agent!.id, userId: client.id, type: 'FIRST_CARD' },
    });
    secondCardNoCommission = {
      ok: commissionCountAfterSecond === 1,
      obtenu: `Commission FIRST_CARD count pour ce client après la 2e carte: ${commissionCountAfterSecond} (attendu 1)`,
    };
  } else {
    secondCardNoCommission = {
      ok: false,
      obtenu: 'carte active déjà présente, impossible de rejouer sans doublon',
    };
  }

  // Client référé fondateur → carte gratuite → aucune commission
  const founderClientEmail = 'test-renaissance-06@ozamapay-staging.test';
  const founderClient = await getOrCreateUser(
    prisma,
    authService,
    founderClientEmail,
    'Test Renaissance 06',
    agentCode,
  );
  await ensureKycSubmitted(kycService, prisma, founderClient.id, '06');
  await ensureKycApproved(adminService, prisma, founderClient.id);
  const founderWalletId = founderClient.wallet!.id;
  let founderOldKycTx = await prisma.transaction.findFirst({
    where: { title: 'Frè KYC', senderWalletId: founderWalletId },
  });
  if (!founderOldKycTx) {
    founderOldKycTx = await prisma.transaction.create({
      data: {
        senderWalletId: founderWalletId,
        type: 'PAYMENT',
        status: 'COMPLETED',
        amount: 3375,
        netAmount: 3375,
        fee: 0,
        title: 'Frè KYC',
        description:
          '[SEED TEST] Ancien KYC payé avant bascule — client référé membre fondateur',
        reference: `TEST-STAGING-SEED-OLD-KYC-${founderClient.id}`,
      },
    });
  }
  const commissionBeforeFounder = await prisma.commission.count({
    where: { agentId: agent!.id, type: 'FIRST_CARD' },
  });
  const founderClientHasCard = await prisma.virtualCard.findFirst({
    where: { userId: founderClient.id },
  });
  if (!founderClientHasCard) {
    await strowalletService.createAndFundCard(founderClient.id, 3);
  }
  const commissionAfterFounder = await prisma.commission.count({
    where: { agentId: agent!.id, type: 'FIRST_CARD', userId: founderClient.id },
  });
  const founderCard = await prisma.virtualCard.findFirst({
    where: { userId: founderClient.id },
  });

  return [
    {
      scenario: '6a. Commission agent — 1ère carte payante du client référé',
      attendu:
        'AgentWallet +200 HTG, Commission{type:FIRST_CARD, userId:client, amount:200}',
      obtenu: `referral lié: ${referralLinked}; Commission trouvée: amount=${commissionAfterFirst?.amount ?? 'AUCUNE'}; AgentWallet ${agentWalletBefore!.balance}→${agentWalletAfterFirst!.balance} HTG`,
      ok: referralLinked && first200Credited,
      montants: '+200 HTG',
    },
    {
      scenario: '6b. Commission agent — 2e carte du même client',
      attendu: 'aucune nouvelle Commission FIRST_CARD',
      obtenu: secondCardNoCommission.obtenu,
      ok: secondCardNoCommission.ok,
      montants: '0 HTG (pas de 2e commission)',
    },
    {
      scenario:
        '6c. Commission agent — carte gratuite fondateur du client référé',
      attendu: 'aucune Commission FIRST_CARD créée (carte gratuite exclue)',
      obtenu: `Commission FIRST_CARD pour ce client fondateur: ${commissionAfterFounder} (attendu 0); carte isFounderFreeCard=${founderCard?.isFounderFreeCard}`,
      ok:
        commissionAfterFounder === 0 && founderCard?.isFounderFreeCard === true,
      montants: '0 HTG',
    },
  ];
}

async function scenario7_echecFournisseur(
  prisma: PrismaService,
  authService: AuthService,
  kycService: KycService,
  adminService: AdminService,
  strowalletService: StrowalletService,
) {
  const email = 'test-renaissance-07@ozamapay-staging.test';
  const user = await getOrCreateUser(
    prisma,
    authService,
    email,
    'Test Renaissance 07',
  );
  await ensureKycSubmitted(kycService, prisma, user.id, '07');
  await ensureKycApproved(adminService, prisma, user.id);
  await ensureWalletAtLeast(prisma, user.id, user.wallet!.id, 3000);

  const existingCard = await getActiveStrowalletCard(prisma, user.id);
  if (existingCard) {
    return {
      scenario:
        '7. Échec fournisseur (STAGING_MOCK_FAILURE_RATE=1) → remboursement intégral',
      attendu:
        'carte créée ÉCHOUE, wallet remboursé intégralement (1500 HTG), aucune Commission',
      obtenu:
        'ANORMAL: une carte existe déjà (run précédent avec échec non garanti?) — scénario non concluant',
      ok: false,
      montants: 'N/A',
    };
  }

  const balanceBefore = Number(
    (await prisma.wallet.findUnique({ where: { userId: user.id } }))!.balance,
  );
  let threw = false;
  let errorMessage = '';
  try {
    await strowalletService.createAndFundCard(user.id, 3);
  } catch (err: any) {
    threw = true;
    errorMessage = err?.message ?? String(err);
  }
  const balanceAfter = Number(
    (await prisma.wallet.findUnique({ where: { userId: user.id } }))!.balance,
  );
  const cardCreated = await getActiveStrowalletCard(prisma, user.id);
  const commissionCreated = await prisma.commission.count({
    where: { userId: user.id, type: 'FIRST_CARD' },
  });
  const refundedFully = balanceBefore === balanceAfter;

  return {
    scenario:
      '7. Échec fournisseur (STAGING_MOCK_FAILURE_RATE=1) → remboursement intégral',
    attendu:
      'createAndFundCard échoue, wallet remboursé intégralement (balance identique avant/après), aucune carte, aucune commission',
    obtenu: `exception levée: ${threw} ("${errorMessage}"); balance ${balanceBefore}→${balanceAfter} HTG; carte créée: ${!!cardCreated}; Commission FIRST_CARD: ${commissionCreated}`,
    ok: threw && refundedFully && !cardCreated && commissionCreated === 0,
    montants: `balance avant/après identique: ${balanceBefore} HTG`,
  };
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  const prisma = app.get(PrismaService);
  const authService = app.get(AuthService);
  const kycService = app.get(KycService);
  const adminService = app.get(AdminService);
  const agentsService = app.get(AgentsService);
  const strowalletService = app.get(StrowalletService);
  const pricingService = app.get(PricingService);

  const accounts: string[] = [];
  let rows: Row[] = loadResults();

  try {
    if (SCENARIO7_ONLY) {
      if (process.env.STAGING_MOCK_FAILURE_RATE !== '1') {
        console.error(
          'ARÈT: --scenario7-only mande STAGING_MOCK_FAILURE_RATE=1 nan anviwònman an.',
        );
        process.exit(1);
      }
      accounts.push('test-renaissance-07@ozamapay-staging.test');
      const r7 = await scenario7_echecFournisseur(
        prisma,
        authService,
        kycService,
        adminService,
        strowalletService,
      );
      rows = rows.filter((r) => !r.scenario.startsWith('7.'));
      rows.push(r7);
    } else {
      const r1 = await scenario1_kycGratuit(
        prisma,
        authService,
        kycService,
        adminService,
        accounts,
      );
      const r2 = await scenario2_carte3usd(
        prisma,
        authService,
        kycService,
        adminService,
        strowalletService,
      );
      accounts.push('test-renaissance-02@ozamapay-staging.test');
      const r3 = await scenario3_carte10usd(
        prisma,
        authService,
        kycService,
        adminService,
        strowalletService,
      );
      accounts.push('test-renaissance-03@ozamapay-staging.test');
      const r4 = await scenario4_soldeInsuffisant(
        prisma,
        authService,
        kycService,
        adminService,
        strowalletService,
      );
      accounts.push('test-renaissance-04@ozamapay-staging.test');
      const r5 = await scenario5_membreFondateur(
        prisma,
        authService,
        kycService,
        adminService,
        strowalletService,
        pricingService,
      );
      accounts.push(
        'test-renaissance-agent@ozamapay-staging.test',
        'test-renaissance-05@ozamapay-staging.test',
        'test-renaissance-06@ozamapay-staging.test',
      );
      const r6 = await scenario6_commissionAgent(
        prisma,
        authService,
        kycService,
        adminService,
        agentsService,
        strowalletService,
      );

      rows = [r1, r2, r3, r4, ...r5, ...r6];
    }

    saveResults(rows);

    const allAccounts = [
      'test-renaissance-01@ozamapay-staging.test',
      'test-renaissance-02@ozamapay-staging.test',
      'test-renaissance-03@ozamapay-staging.test',
      'test-renaissance-04@ozamapay-staging.test',
      'test-renaissance-agent@ozamapay-staging.test',
      'test-renaissance-05@ozamapay-staging.test',
      'test-renaissance-06@ozamapay-staging.test',
      'test-renaissance-07@ozamapay-staging.test',
    ];
    printReport(rows, allAccounts);
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error('ERÈ FATAL SCRIPT:', err);
  process.exit(1);
});
