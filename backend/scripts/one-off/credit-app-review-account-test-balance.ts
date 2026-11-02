/**
 * credit-app-review-account-test-balance.ts
 *
 * Script ponctuel : crédite 1 000 HTG de solde TEST au compte A (reviewer)
 * du dispositif App Store/Google Play review, pour que le reviewer puisse
 * tester dépôt/transfert/convert sans argent réel. Transaction + LedgerEntry
 * créés, marqués clairement DEMO/TEST.
 *
 * Exclusion réconciliation : le seul job de réconciliation réel du repo
 * (src/tron/reconciliation.service.ts) compare UNIQUEMENT
 * SUM(CryptoDeposit.amountUsdt WHERE status='CREDITED') à l'on-chain — il
 * ne touche jamais Transaction/LedgerEntry/Wallet.balance. Un crédit qui ne
 * passe jamais par CryptoDeposit en est donc déjà structurellement exclu ;
 * aucun changement de schéma nécessaire pour ça. method='DEMO_TEST_CREDIT'
 * et la description ci-dessous servent à le repérer immédiatement dans
 * n'importe quelle liste admin/export futur.
 *
 * Refuse de tourner si APP_ENV != 'staging'.
 *
 * Safety: DRY-RUN par défaut (montre le calcul, AUCUNE écriture). Lancer
 * avec --confirm pour exécuter. Anti-double-exécution : vérifie qu'aucune
 * Transaction DEMO_TEST_CREDIT n'existe déjà pour ce wallet.
 */
import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient, Prisma } from '@prisma/client';
import { isStaging } from '../../src/config/app-env';

const prisma = new PrismaClient();

const AMOUNT = 1000; // HTG — net, pas de frais, pas de part MASTER
const METHOD = 'DEMO_TEST_CREDIT';
const MARKER = '[DEMO/TEST — App Store review account, exclu de la réconciliation]';

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} pa konfigire nan env — kanpe.`);
  return value;
}

async function main() {
  const confirm = process.argv.includes('--confirm');

  if (!isStaging()) {
    throw new Error("APP_ENV != 'staging' — script sa a refize kouri an deyò staging.");
  }

  const emailsRaw = readRequiredEnv('APP_REVIEW_ACCOUNT_EMAILS');
  const emailA = emailsRaw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)[0];
  if (!emailA) {
    throw new Error('APP_REVIEW_ACCOUNT_EMAILS vid oswa mal fòme — pa jwenn kont A.');
  }

  const user = await prisma.user.findUnique({ where: { email: emailA }, include: { wallet: true } });
  if (!user) throw new Error(`Kont A (${emailA}) pa jwenn — kouri seed-app-review-accounts.ts --confirm anvan.`);
  if (!user.wallet) throw new Error(`Wallet pa jwenn pou ${emailA}`);

  const alreadyCredited = await prisma.transaction.findFirst({
    where: { receiverWalletId: user.wallet.id, method: METHOD },
  });
  if (alreadyCredited) {
    throw new Error(
      `Deja gen yon kredi DEMO_TEST_CREDIT (id=${alreadyCredited.id}) pou kont sa a — ` +
      `pa egzekite ankò san verifye.`,
    );
  }

  const balanceBefore = user.wallet.balance;

  console.log(`=== ${confirm ? 'EGZEKISYON' : 'DRY-RUN'}: Kredi solde test — compte A review ===`);
  console.log({
    email: emailA,
    userId: user.id,
    walletId: user.wallet.id,
    amount: AMOUNT,
    method: METHOD,
    balanceBefore: balanceBefore.toString(),
    balanceAfter_projected: (Number(balanceBefore) + AMOUNT).toFixed(2),
  });

  if (!confirm) {
    console.log('\n(Dry-run sèlman — pa gen anyen ekri. Kouri ak --confirm pou egzekite.)');
    return;
  }

  const reference = `DEMO-TEST-${Date.now()}`;

  const result = await prisma.$transaction(async (tx) => {
    const updatedWallet = await tx.wallet.update({
      where: { id: user.wallet!.id },
      data: { balance: { increment: AMOUNT } },
    });

    const transaction = await tx.transaction.create({
      data: {
        reference,
        receiverWalletId: user.wallet!.id,
        amount: AMOUNT,
        fee: 0,
        netAmount: AMOUNT,
        type: 'TOPUP',
        status: 'COMPLETED',
        method: METHOD,
        title: `Solde test démo — ${AMOUNT} HTG`,
        description: MARKER,
      },
    });

    await tx.ledgerEntry.create({
      data: {
        walletId: user.wallet!.id,
        transactionId: transaction.id,
        type: 'CREDIT',
        amount: AMOUNT,
        balanceBefore,
        balanceAfter: updatedWallet.balance,
        description: MARKER,
      },
    });

    return transaction;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  console.log('\n=== EGZEKITE ===');
  console.log(JSON.stringify(result, null, 2));
  console.log(`\n✅ ${AMOUNT} HTG kredite pou ${emailA} (TEST/démo, exclu réconciliation).`);
}

main()
  .catch((err) => {
    console.error('ERÈ:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
