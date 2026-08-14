/**
 * disable-daily-code-24h.ts
 *
 * ONE-OFF script (14 out 2026) — sispann egzijans kòd jounalye/2FA pou admin
 * pandan 24h, tan pou rezoud pwoblèm livrezon Brevo a (kont gratis rive nan
 * limit 300 imel/jou, kòd jounalye pa t rive nan bwat admin la).
 *
 * Itilize AdminService.pauseDailyCodeRequirement(24) — sa envalide kòd aktif
 * la kounye a (login admin pa mande kòd ankò imedyatman), epi kreye yon
 * "placeholder" ki make lè poz la dwe fini. Yon cron entèn
 * (resumeDailyCodeAfterPause, chak 15 min) reyaktive egzijans lan
 * otomatikman apre 24h — pa gen okenn lòt aspè sekirite kont admin la
 * (modpas, elatriye) ki afekte.
 *
 * Kòmand (nan /backend):
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/disable-daily-code-24h.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { MailModule } from '../../src/mail/mail.module';
import { AdminService } from '../../src/admin/admin.service';
import { PrismaService } from '../../src/prisma/prisma.service';

@Module({
  imports: [MailModule],
  providers: [AdminService, PrismaService],
})
class DisableDailyCodeModule {}

async function main() {
  const app = await NestFactory.createApplicationContext(DisableDailyCodeModule, { logger: ['error', 'warn'] });
  const adminService = app.get(AdminService);

  try {
    const { resumeAt } = await adminService.pauseDailyCodeRequirement(24);
    console.log('[OK] Egzijans kòd jounalye SISPANN pou 24h.');
    console.log(`[OK] Ap reprann otomatikman: ${resumeAt.toISOString()} (${resumeAt.toLocaleString('fr-FR', { timeZone: 'America/Port-au-Prince' })} lè Ayiti)`);
    console.log('[OK] Ou ka konekte kounye a san kòd jounalye a (modpas toujou obligatwa).');
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error('ERROR', err.message);
  process.exit(1);
});
