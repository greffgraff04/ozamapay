/**
 * notify-three-groups-20260824.ts
 *
 * Script one-off, egzekite yon sèl fwa (24 out 2026) pou enfòme 3 gwoup
 * kliyan distenk sou sitiyasyon aktyèl yo. PA reyize pou lòt sitiyasyon
 * san apwobasyon biznis, dat, ak rezon klè.
 *
 * ONE-OFF script. Voye TWA tanplè diferan bay TWA gwoup diferan:
 *
 *   Gwoup 1 (sendWithdrawalNetworkResolvedNotice) — kliyan ki gen omwen yon
 *   Transaction type=WITHDRAWAL, status=PENDING, method MonCash oswa NatCash
 *   (demann retrè an atant akoz pwoblèm rezo).
 *
 *   Gwoup 2 (sendCardCreationProviderDelayNotice) — kliyan ki gen
 *   Kyc.status APPROVED E ZERO VirtualCard kreye (nenpòt status — ACTIVE,
 *   FROZEN, TERMINATED, REPLACED, PENDING_RECHARGE — okenn kat pa janm
 *   kreye pou yo).
 *
 *   Gwoup 3 (sendCardServiceProviderMaintenanceNotice) — kliyan ki gen
 *   omwen 1 VirtualCard ACTIVE oswa FROZEN.
 *
 * Gwoup yo se 3 dimansyon separe (retrè vs kat) — yon kliyan ka kalifye pou
 * Gwoup 1 AK Gwoup 2/3 anmenmtan (2 imel diferan, sou 2 sijè diferan). Pa
 * gen dedwipe ant gwoup yo, sèlman pa userId LADAN chak gwoup separeman.
 *
 * Safety: DRY-RUN pa default (montre konbyen kliyan nan chak gwoup +
 * echantiyon 3 non/imel pa gwoup, ak konbyen chevochman genyen ant gwoup 1
 * ak 2/3 pou enfòmasyon, AUKENN imèl reyèl voye). Kouri ak --confirm pou
 * voye pou tout bon.
 *
 * Kòmand (nan /backend):
 *   npx ts-node --transpile-only scripts/one-off/notify-three-groups-20260824.ts            # dry-run
 *   npx ts-node --transpile-only scripts/one-off/notify-three-groups-20260824.ts --confirm  # live
 */

import { NestFactory } from '@nestjs/core';
import { StrowalletModule } from '../../src/strowallet/strowallet.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { MailService } from '../../src/mail/mail.service';

type Recipient = { name: string; email: string };

async function main() {
  const confirm = process.argv.includes('--confirm');

  const app = await NestFactory.createApplicationContext(StrowalletModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);
  const mailService = app.get(MailService);

  try {
    // ── Gwoup 1: retrè MonCash/NatCash an atant ─────────────────────────────
    const pendingWithdrawals = await prisma.transaction.findMany({
      where: { type: 'WITHDRAWAL', status: 'PENDING' },
      include: { senderWallet: { include: { user: { select: { id: true, name: true, email: true } } } } },
    });

    const group1Map = new Map<string, Recipient>();
    for (const tx of pendingWithdrawals) {
      const method = (tx.method ?? '').toLowerCase();
      if (method !== 'moncash' && method !== 'natcash') continue;
      const user = tx.senderWallet?.user;
      if (!user?.email) continue;
      if (!group1Map.has(user.id)) {
        group1Map.set(user.id, { name: user.name ?? 'Kliyan', email: user.email });
      }
    }

    // ── Gwoup 2: KYC APPROVED + ZERO VirtualCard (nenpòt status) ────────────
    const group2Users = await prisma.user.findMany({
      where: {
        kyc: { status: 'APPROVED' },
        virtualCards: { none: {} },
      },
      select: { id: true, name: true, email: true },
    });

    const group2Map = new Map<string, Recipient>();
    for (const user of group2Users) {
      if (!user.email) continue;
      group2Map.set(user.id, { name: user.name ?? 'Kliyan', email: user.email });
    }

    // ── Gwoup 3: omwen 1 VirtualCard ACTIVE oswa FROZEN ─────────────────────
    const group3Cards = await prisma.virtualCard.findMany({
      where: { status: { in: ['ACTIVE', 'FROZEN'] } },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const group3Map = new Map<string, Recipient>();
    for (const card of group3Cards) {
      if (!card.user?.email) continue;
      if (!group3Map.has(card.userId)) {
        group3Map.set(card.userId, { name: card.user.name ?? 'Kliyan', email: card.user.email });
      }
    }

    const group1 = Array.from(group1Map.values());
    const group2 = Array.from(group2Map.values());
    const group3 = Array.from(group3Map.values());

    const overlap12 = [...group1Map.keys()].filter((id) => group2Map.has(id)).length;
    const overlap13 = [...group1Map.keys()].filter((id) => group3Map.has(id)).length;

    console.log('── Gwoup 1: retrè MonCash/NatCash an atant (sendWithdrawalNetworkResolvedNotice) ──');
    console.log(`  Total Transaction WITHDRAWAL/PENDING (MonCash/NatCash): ${
      pendingWithdrawals.filter(t => ['moncash','natcash'].includes((t.method ?? '').toLowerCase())).length
    }`);
    console.log(`  Total kliyan inik (dedwipe pa userId): ${group1.length}`);
    console.log('  Echantiyon (3 premye):');
    group1.slice(0, 3).forEach((r, i) => console.log(`    ${i + 1}. ${r.name} <${r.email}>`));

    console.log('\n── Gwoup 2: KYC APPROVED, ZERO kat kreye (sendCardCreationProviderDelayNotice) ──');
    console.log(`  Total kliyan inik: ${group2.length}`);
    console.log('  Echantiyon (3 premye):');
    group2.slice(0, 3).forEach((r, i) => console.log(`    ${i + 1}. ${r.name} <${r.email}>`));

    console.log('\n── Gwoup 3: omwen 1 kat ACTIVE/FROZEN (sendCardServiceProviderMaintenanceNotice) ──');
    console.log(`  Total kliyan inik: ${group3.length}`);
    console.log('  Echantiyon (3 premye):');
    group3.slice(0, 3).forEach((r, i) => console.log(`    ${i + 1}. ${r.name} <${r.email}>`));

    console.log('\n── Chevochman (enfòmasyon sèlman — pa gen dedwipe aplike) ──');
    console.log(`  Gwoup 1 ∩ Gwoup 2: ${overlap12} kliyan (ap resevwa 2 imel)`);
    console.log(`  Gwoup 1 ∩ Gwoup 3: ${overlap13} kliyan (ap resevwa 2 imel)`);
    console.log('─────────────────────────────────────────────────────────────');

    if (!confirm) {
      console.log('\n[DRY-RUN] Pa gen okenn imèl ki voye. Kouri ak --confirm pou egzekite pou tout bon.');
      return;
    }

    const groups: [string, Recipient[], (email: string) => Promise<void>][] = [
      ['Gwoup 1', group1, (email) => mailService.sendWithdrawalNetworkResolvedNotice(email)],
      ['Gwoup 2', group2, (email) => mailService.sendCardCreationProviderDelayNotice(email)],
      ['Gwoup 3', group3, (email) => mailService.sendCardServiceProviderMaintenanceNotice(email)],
    ];

    let totalSent = 0;
    let totalFailed = 0;
    for (const [label, recipients, sendFn] of groups) {
      console.log(`\n[LIVE] Ap voye imèl ${label}...`);
      let sent = 0;
      let failed = 0;
      for (const r of recipients) {
        try {
          await sendFn(r.email);
          sent++;
        } catch (err: any) {
          failed++;
          console.error(`  ✗ Echwe pou ${r.email}: ${err?.message ?? err}`);
        }
      }
      console.log(`  Fini ${label}: ${sent} voye, ${failed} echwe (sou ${recipients.length}).`);
      totalSent += sent;
      totalFailed += failed;
    }

    console.log(`\n[LIVE] Total: ${totalSent} imèl voye, ${totalFailed} echwe.`);
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
