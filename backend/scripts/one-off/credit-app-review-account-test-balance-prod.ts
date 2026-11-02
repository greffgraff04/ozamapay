/**
 * credit-app-review-account-test-balance-prod.ts
 *
 * Variante PRODUCTION de credit-app-review-account-test-balance.ts — même
 * crédit de 1 000 HTG de solde TEST au compte A (reviewer), même exclusion
 * de la réconciliation (method='DEMO_TEST_CREDIT', cf. le fichier staging
 * pour le détail de cette exclusion — inchangé ici).
 *
 * Garde-fou supplémentaire requis pour tourner en prod : --target=production
 * ET APP_ENV=production doivent toulede concorder, sinon refus (même
 * double-verrou que seed-app-review-accounts-prod.ts — voir ce fichier pour
 * le raisonnement).
 *
 * Ne touche jamais à la version staging
 * (scripts/one-off/credit-app-review-account-test-balance.ts) — fichier
 * séparé.
 *
 * Safety: DRY-RUN par défaut (montre le calcul, AUCUNE écriture). Lancer
 * avec --confirm --target=production pour exécuter. Anti-double-exécution :
 * vérifie qu'aucune Transaction DEMO_TEST_CREDIT n'existe déjà pour ce
 * wallet.
 */
import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const AMOUNT = 1000; // HTG — net, pas de frais, pas de part MASTER
const METHOD = 'DEMO_TEST_CREDIT';
const MARKER = '[DEMO/TEST — App Store review account, exclu de la réconciliation]';

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} pa konfigire nan env — kanpe.`);
  return value;
}

function parseTargetFlag(): string | null {
  const arg = process.argv.find((a) => a.startsWith('--target='));
  return arg ? arg.slice('--target='.length) : null;
}

function assertProductionTargetConfirmed(): void {
  const target = parseTargetFlag();
  const appEnv = process.env.APP_ENV;

  if (target !== 'production' || appEnv !== 'production') {
    throw new Error(
      `Refize: fòk --target=production AK APP_ENV=production toulede konkòde. ` +
      `Jwenn --target=${target ?? '(absan)'}, APP_ENV=${appEnv ?? '(absan)'}.`,
    );
  }
}

async function main() {
  const confirm = process.argv.includes('--confirm');

  assertProductionTargetConfirmed();

  const emailsRaw = readRequiredEnv('APP_REVIEW_ACCOUNT_EMAILS');
  const emailA = emailsRaw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)[0];
  if (!emailA) {
    throw new Error('APP_REVIEW_ACCOUNT_EMAILS vid oswa mal fòme — pa jwenn kont A.');
  }

  const user = await prisma.user.findUnique({ where: { email: emailA }, include: { wallet: true } });
  if (!user) throw new Error(`Kont A (${emailA}) pa jwenn — kouri seed-app-review-accounts-prod.ts --confirm --target=production anvan.`);
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

  console.log(`=== ${confirm ? 'EGZEKISYON' : 'DRY-RUN'}: Kredi solde test — compte A review (PRODUCTION) ===`);
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
    console.log('\n(Dry-run sèlman — pa gen anyen ekri. Kouri ak --confirm --target=production pou egzekite.)');
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

    const ledgerEntry = await tx.ledgerEntry.create({
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

    return { transaction, ledgerEntry };
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
