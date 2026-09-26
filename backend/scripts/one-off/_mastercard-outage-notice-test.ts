/**
 * TÈS SÈLMAN. Voye avis pann tanporè Mastercard bay ceo@ozamapay.com
 * sèlman, pou verifye rann li byen anvan bulk send bay 104 itilizatè
 * KYC APPROVED yo.
 *
 * Egzekite (nan /backend):
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/_mastercard-outage-notice-test.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { MailService } from '../../src/mail/mail.service';

async function main() {
  const mail = new MailService();
  await mail.sendMastercardTemporaryOutageNotice('contact@ozamapay.com');
  console.log('Tès voye bay contact@ozamapay.com');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
