/**
 * seed-app-review-accounts-prod.ts
 *
 * Variante PRODUCTION de seed-app-review-accounts.ts — même logique, même
 * provisioning des 2 comptes démo App Store/Google Play review (compte A =
 * reviewer, compte B = destinataire), mais avec un garde-fou supplémentaire
 * requis pour tourner en prod : il faut --target=production EN PLUS d'un
 * APP_ENV=production qui correspond. Les deux doivent concorder, sinon
 * refus — un seul des deux signaux (flag oublié, ou mauvais environnement
 * par erreur de déploiement) ne suffit jamais à déclencher une écriture.
 *
 * Ne touche jamais à la version staging (scripts/one-off/seed-app-review-accounts.ts) —
 * fichier séparé, à maintenir en parallèle si la logique de seed évolue.
 *
 * AUCUNE valeur (email, mot de passe, PIN) codée en dur — tout vient des
 * variables d'env créées sur Render production :
 *   APP_REVIEW_ACCOUNT_EMAILS   (2 emails séparés par virgule, A puis B)
 *   APP_REVIEW_ACCOUNT_A_PASSWORD
 *   APP_REVIEW_ACCOUNT_B_PASSWORD
 *   APP_REVIEW_ACCOUNT_PIN      (PIN transaction partagé par A et B, pour
 *                                 le transfert démo A<->B)
 *
 * Idempotent : si le compte existe déjà, met à jour mot de passe/PIN/rôle/
 * emailVerified depuis les env vars actuelles, mais NE TOUCHE JAMAIS au
 * solde du wallet existant.
 *
 * Safety: DRY-RUN par défaut (aucune écriture BDD, aucun mot de passe/PIN
 * généré ou affiché). Lancer avec --confirm --target=production pour
 * exécuter.
 */
import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} pa konfigire nan env — kanpe.`);
  return value;
}

function parseTargetFlag(): string | null {
  const arg = process.argv.find((a) => a.startsWith('--target='));
  return arg ? arg.slice('--target='.length) : null;
}

// Double verrou volontaire : le flag CLI ET APP_ENV doivent TOUS LES DEUX
// dire 'production'. Aucun des deux seul ne suffit — protège contre un
// flag --target=production copié-collé par erreur dans un terminal pointé
// sur staging, ET contre un APP_ENV=production mal injecté sans que
// l'opérateur ait explicitement voulu cibler la prod.
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

  assertProductionTargetConfirmed();

  const emailsRaw = readRequiredEnv('APP_REVIEW_ACCOUNT_EMAILS');
  const emails = emailsRaw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (emails.length !== 2) {
    throw new Error(`APP_REVIEW_ACCOUNT_EMAILS dwe gen EGZATMAN 2 email separe pa virgil, jwenn ${emails.length}.`);
  }
  const [emailA, emailB] = emails;

  console.log(`=== ${confirm ? 'EGZEKISYON' : 'DRY-RUN'}: Seed kont demo App Store/Google Play review (PRODUCTION) ===`);

  if (confirm) {
    const pin = readRequiredEnv('APP_REVIEW_ACCOUNT_PIN');
    await upsertAccount('A', emailA, 'APP_REVIEW_ACCOUNT_A_PASSWORD', pin, true);
    await upsertAccount('B', emailB, 'APP_REVIEW_ACCOUNT_B_PASSWORD', pin, true);
  } else {
    await upsertAccount('A', emailA, 'APP_REVIEW_ACCOUNT_A_PASSWORD', '', false);
    await upsertAccount('B', emailB, 'APP_REVIEW_ACCOUNT_B_PASSWORD', '', false);
    console.log('\n(Dry-run sèlman — kouri ak --confirm --target=production pou egzekite.)');
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
