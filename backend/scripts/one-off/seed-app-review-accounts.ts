/**
 * seed-app-review-accounts.ts
 *
 * Script ponctuel pour créer (ou resynchroniser) les 2 comptes démo App
 * Store / Google Play review : compte A = reviewer, compte B = destinataire.
 * Pas d'inscription possible pour ces emails via /auth/register (bloqué
 * dans AuthService.register) — c'est ce script qui doit les créer.
 *
 * AUCUNE valeur (email, mot de passe, PIN) codée en dur ici — tout vient
 * des variables d'env créées sur Render staging :
 *   APP_REVIEW_ACCOUNT_EMAILS   (2 emails séparés par virgule, A puis B)
 *   APP_REVIEW_ACCOUNT_A_PASSWORD
 *   APP_REVIEW_ACCOUNT_B_PASSWORD
 *   APP_REVIEW_ACCOUNT_PIN      (PIN transaction partagé par A et B, pour
 *                                 le transfert démo A<->B)
 *
 * Refuse de tourner si APP_ENV != 'staging' — ces comptes n'ont aucune
 * raison d'exister en production.
 *
 * Idempotent : si le compte existe déjà, met à jour mot de passe/PIN/rôle/
 * emailVerified depuis les env vars actuelles (permet de faire tourner
 * de nouveau pour "roter" un mot de passe), mais NE TOUCHE JAMAIS au solde
 * du wallet existant.
 *
 * Safety: DRY-RUN par défaut (aucune écriture BDD, aucun mot de passe/PIN
 * généré ou affiché). Lancer avec --confirm pour exécuter.
 */
import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { isStaging } from '../../src/config/app-env';

const prisma = new PrismaClient();

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} pa konfigire nan env — kanpe.`);
  return value;
}

async function upsertAccount(label: 'A' | 'B', email: string, passwordEnvVar: string, pin: string, confirm: boolean) {
  const existing = await prisma.user.findUnique({ where: { email }, include: { wallet: true } });

  console.log(`\n=== Kont ${label}: ${email} ===`);
  console.log({ existe_deja: !!existing, wallet_existe: !!existing?.wallet });

  if (!confirm) {
    console.log('(Dry-run — pa gen anyen li/afiche sou modpas oswa PIN, pa gen ekriti.)');
    return;
  }

  const password = readRequiredEnv(passwordEnvVar);
  const hashedPassword = await bcrypt.hash(password, 10);
  const hashedPin = await bcrypt.hash(pin, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      transactionPin: hashedPin,
      role: 'USER',
      emailVerified: true,
      isSuspended: false,
    },
    create: {
      email,
      password: hashedPassword,
      transactionPin: hashedPin,
      name: `OZAMAPAY Demo ${label === 'A' ? 'Reviewer' : 'Destinataire'}`,
      role: 'USER',
      emailVerified: true,
    },
  });

  // Wallet kreye sèlman si li pa egziste — jamè reset yon balans ki deja la.
  await prisma.wallet.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, balance: 0 },
  });

  console.log(`✅ Kont ${label} (${email}) sync — id=${user.id}`);
}

async function main() {
  const confirm = process.argv.includes('--confirm');

  if (!isStaging()) {
    throw new Error("APP_ENV != 'staging' — script sa a refize kouri an deyò staging.");
  }

  const emailsRaw = readRequiredEnv('APP_REVIEW_ACCOUNT_EMAILS');
  const emails = emailsRaw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (emails.length !== 2) {
    throw new Error(`APP_REVIEW_ACCOUNT_EMAILS dwe gen EGZATMAN 2 email separe pa virgil, jwenn ${emails.length}.`);
  }
  const [emailA, emailB] = emails;

  console.log(`=== ${confirm ? 'EGZEKISYON' : 'DRY-RUN'}: Seed kont demo App Store/Google Play review ===`);

  if (confirm) {
    const pin = readRequiredEnv('APP_REVIEW_ACCOUNT_PIN');
    await upsertAccount('A', emailA, 'APP_REVIEW_ACCOUNT_A_PASSWORD', pin, true);
    await upsertAccount('B', emailB, 'APP_REVIEW_ACCOUNT_B_PASSWORD', pin, true);
  } else {
    await upsertAccount('A', emailA, 'APP_REVIEW_ACCOUNT_A_PASSWORD', '', false);
    await upsertAccount('B', emailB, 'APP_REVIEW_ACCOUNT_B_PASSWORD', '', false);
    console.log('\n(Dry-run sèlman — kouri ak --confirm pou egzekite.)');
  }
}

main()
  .catch((err) => {
    console.error('ERÈ:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
