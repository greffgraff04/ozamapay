/**
 * notify-card-available-ryan-gleen.ts
 *
 * Script one-off, egzekite yon sèl fwa (8 out 2026) pou enfòme DE kliyan
 * (Ryan Desir ak Gleen Junior Valmyr) kat vityèl yo fèk kreye e finanse ak
 * $3 USD. PA reyize pou lòt kliyan san apwobasyon biznis, dat, ak rezon klè.
 *
 * NB: Gen DE kont ki rele "Ryan Desir" nan BDD — sèlman
 * chayannbigfrontaine@gmail.com gen KYC APPROVED ak yon VirtualCard aktif
 * (kreye jodi a, balans $3). Lòt kont lan (desirryan65@gmail.com) pa gen
 * ni KYC ni kat — PA ENKLI nan lis la.
 *
 * ONE-OFF script. Voye sendCardAvailable(email, name, 3) — kat FÈK kreye pou
 * premye fwa, PA yon ranplasman (verifye: terminatedAt=null,
 * replacedByCardId=null pou toude kat yo), donk sendCardReplaced() pa
 * apwopriye isit la (li ta mansyone yon "ansyen kat" ki pa egziste, e li
 * mansyone non founisè a "StroWallet" nan tèks kliyan wè).
 *
 * Safety: DRY-RUN pa default (verifye kat yo nan BDD epi montre sa k ap
 * fèt, AUKENN imèl voye). Kouri ak --confirm pou voye pou tout bon.
 *
 * Kòmand (nan /backend):
 *   npx ts-node --transpile-only scripts/one-off/notify-card-available-ryan-gleen.ts            # dry-run
 *   npx ts-node --transpile-only scripts/one-off/notify-card-available-ryan-gleen.ts --confirm  # live
 */

import { NestFactory } from '@nestjs/core';
import { StrowalletModule } from '../../src/strowallet/strowallet.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { MailService } from '../../src/mail/mail.service';

const AMOUNT_USD = 3;

const RECIPIENTS = [
  { label: 'Ryan Desir', email: 'chayannbigfrontaine@gmail.com', expectedCardId: '6a7775a906f651219f04c376' },
  { label: 'Gleen Junior Valmyr', email: 'gjunehbk@gmail.com', expectedCardId: '6a777a4b4e5821c0a491687c' },
];

async function main() {
  const confirm = process.argv.includes('--confirm');

  const app = await NestFactory.createApplicationContext(StrowalletModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);
  const mailService = app.get(MailService);

  try {
    console.log('── Verifikasyon kliyan yo ──────────────────────────────────');
    const toSend: { name: string; email: string }[] = [];

    for (const r of RECIPIENTS) {
      const user = await prisma.user.findUnique({
        where: { email: r.email },
        include: { virtualCards: true },
      });

      if (!user) {
        console.error(`✗ ${r.label}: pa jwenn itilizatè ak email ${r.email} — SOTE`);
        continue;
      }

      const card = user.virtualCards.find((c) => c.cardId === r.expectedCardId);
      if (!card) {
        console.error(`✗ ${r.label}: pa jwenn kat ${r.expectedCardId} sou kont ${r.email} — SOTE`);
        continue;
      }
      if (card.status !== 'ACTIVE') {
        console.error(`✗ ${r.label}: kat ${card.cardId} gen status="${card.status}", li pa ACTIVE — SOTE`);
        continue;
      }
      if (Number(card.balance) < AMOUNT_USD) {
        console.error(`✗ ${r.label}: balans kat (${card.balance}) pi piti pase $${AMOUNT_USD} atann — SOTE`);
        continue;
      }

      console.log(`✓ ${r.label} <${user.email}> — kat ${card.cardId} | status=${card.status} | balans=$${card.balance}`);
      toSend.push({ name: user.name ?? r.label, email: user.email });
    }

    console.log('── Aksyon planifye ─────────────────────────────────────────');
    toSend.forEach((r, i) => {
      console.log(`  ${i + 1}. sendCardAvailable(${r.email}, "${r.name}", $${AMOUNT_USD.toFixed(2)})`);
    });
    console.log('─────────────────────────────────────────────────────────────');

    if (!confirm) {
      console.log('\n[DRY-RUN] Pa gen okenn imèl ki voye. Kouri ak --confirm pou egzekite pou tout bon.');
      return;
    }

    console.log('\n[LIVE] Ap voye imèl yo...');
    let sent = 0;
    let failed = 0;
    for (const r of toSend) {
      try {
        await mailService.sendCardAvailable(r.email, r.name, AMOUNT_USD);
        sent++;
        console.log(`  ✓ Voye bay ${r.email}`);
      } catch (err: any) {
        failed++;
        console.error(`  ✗ Echwe pou ${r.email}: ${err?.message ?? err}`);
      }
    }
    console.log(`\n[LIVE] Fini. ${sent} imèl voye, ${failed} echwe (sou ${toSend.length} total).`);
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
