/**
 * BULK SEND. Voye avis pann tanporè Mastercard bay TOUT itilizatè ki gen
 * KYC APPROVED (= "verified"), youn apre lòt ak yon ti poz ant chak voye
 * pou evite deklannche rate limit/spam filter founisè mail la.
 *
 * Rele Brevo dirèkteman (menm jan ak scripts/kyc-email-batch-send.ts) pou
 * detekte echèk reyèl — MailService.send() anbrase erè li yo san rejte,
 * sa fè l pa fyab pou konte siksè/echèk nan yon bulk send.
 *
 * Idempotan: si script la rele 2 fwa, li li log lokal la anvan epi skip
 * moun ki deja resevwa l ak siksè.
 *
 * Log: backend/scripts/one-off/_mastercard-notice-log.json (lokal sèlman,
 * pa nan DB, pa commite).
 *
 * Egzekite (nan /backend):
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/_mastercard-outage-notice-send.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ quiet: true } as any);

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { BrevoClient } from '@getbrevo/brevo';

const prisma = new PrismaClient();
const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY as string });

const SENDER = { name: 'OZAMAPAY', email: 'contact@ozamapay.com' };
const SUBJECT = 'Avis important : interruption temporaire de service sur les cartes Mastercard OZAMAPAY';

const LOG_PATH = path.join(__dirname, '_mastercard-notice-log.json');
const DELAY_MS = 1500;

function buildHtml(): string {
  const p = (text: string) =>
    `<p style="margin:0 0 14px;font-size:14px;color:#444444;line-height:1.7;">${text}</p>`;
  const body =
    p('Madame, Monsieur,') +
    p("Nous tenons à vous informer d'une interruption temporaire affectant certaines opérations liées aux cartes Mastercard émises via la plateforme OZAMAPAY.") +
    p("Cet incident trouve son origine chez notre partenaire bancaire émetteur et n'affecte en aucun cas la sécurité de vos fonds ni l'intégrité de votre compte OZAMAPAY. Nos équipes techniques, en coordination étroite avec celles de notre partenaire, sont pleinement mobilisées pour rétablir un fonctionnement normal dans les plus brefs délais.") +
    p("Durant cette période, vous pourriez rencontrer des difficultés lors de transactions, de rechargements ou de consultations relatives à votre carte Mastercard. Nous vous invitons à ne pas multiplier les tentatives, celles-ci n'ayant aucune incidence sur le délai de résolution et pouvant générer des messages d'erreur récurrents.") +
    p("Nous sommes pleinement conscients de la gêne que cette situation peut occasionner dans votre usage quotidien, et vous prions de bien vouloir nous en excuser. La confiance que vous accordez à OZAMAPAY constitue le fondement de notre engagement, et nous mettons tout en œuvre pour vous garantir un service à la hauteur de vos attentes.") +
    p("Une communication vous sera adressée dès le rétablissement complet du service, ainsi qu'un point d'étape si la résolution venait à requérir davantage de temps que prévu.") +
    p('Notre équipe de support demeure à votre entière disposition pour toute question.') +
    p('Nous vous remercions de votre compréhension et de la confiance que vous continuez de nous témoigner.') +
    p("Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.") +
    p("L'équipe OZAMAPAY");

  return `<!DOCTYPE html>
<html lang="ht">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${SUBJECT}</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:4px;overflow:hidden;border:1px solid #eeeeee;">
        <tr>
          <td style="background:#e65100;padding:28px 40px;">
            <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,0.65);text-transform:uppercase;">OZAMAPAY</p>
            <p style="margin:8px 0 0;font-size:26px;font-weight:600;color:#ffffff;line-height:1.2;">Avis Important</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px 32px;">
            ${body}
          </td>
        </tr>
        <tr>
          <td style="border-top:0.5px solid #eeeeee;padding:20px 40px;background:#fafafa;">
            <p style="margin:0 0 6px;font-size:11px;color:#999999;line-height:1.6;">Pa janm pataje PIN ou ak pèsòn — menm ekip OZAMAPAY pa ka mande l.</p>
            <p style="margin:0;font-size:11px;color:#bbbbbb;">OZAMAPAY — Jakmel, Ayiti &nbsp;·&nbsp; <a href="mailto:contact@ozamapay.com" style="color:#FF6B00;text-decoration:none;">contact@ozamapay.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

type LogEntry = {
  email: string;
  userId: string;
  status: 'success' | 'failed';
  error?: string;
  at: string;
};

function loadLog(): LogEntry[] {
  if (!fs.existsSync(LOG_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function appendLog(log: LogEntry[], entry: LogEntry) {
  log.push(entry);
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const where = { kyc: { status: 'APPROVED' as const } };

  const users = await prisma.user.findMany({
    where,
    select: { id: true, email: true, name: true },
    orderBy: { createdAt: 'asc' },
  });

  const log = loadLog();
  const alreadySent = new Set(
    log.filter(e => e.status === 'success').map(e => e.email),
  );

  const remaining = users.filter(u => !alreadySent.has(u.email));
  const html = buildHtml();

  console.log(`Total itilizatè verifye: ${users.length}`);
  console.log(`Deja voye ak siksè (nan log): ${alreadySent.size}`);
  console.log(`Rete pou voye: ${remaining.length}`);
  console.log('');

  let sent = 0;
  let failed = 0;

  for (const u of remaining) {
    try {
      await brevo.transactionalEmails.sendTransacEmail({
        sender: SENDER,
        to: [{ email: u.email }],
        subject: SUBJECT,
        htmlContent: html,
      });
      appendLog(log, {
        email: u.email,
        userId: u.id,
        status: 'success',
        at: new Date().toISOString(),
      });
      sent++;
      console.log(`✓ ${u.email}`);
    } catch (err) {
      appendLog(log, {
        email: u.email,
        userId: u.id,
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
        at: new Date().toISOString(),
      });
      failed++;
      console.error(`✗ ${u.email}:`, err instanceof Error ? err.message : err);
    }
    await sleep(DELAY_MS);
  }

  console.log('');
  console.log(`Fini. Voye kounye a: ${sent} — Echwe kounye a: ${failed} — Deja voye anvan: ${alreadySent.size}`);
  console.log(`Total kimilatif nan log: ${loadLog().filter(e => e.status === 'success').length} siksè / ${users.length} itilizatè verifye`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
