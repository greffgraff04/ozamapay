import { ForbiddenException } from '@nestjs/common';

// Additive safety layer for the Apple/Google Store review demo accounts —
// same philosophy as src/config/app-env.ts (isStaging()): pure functions,
// raw process.env, fail closed, NEVER log the actual secret values (emails
// are not secret, but APP_REVIEW_OTP_CODE and the account passwords/PINs
// are — those never flow through any of these functions).
//
// Two kinds of checks on purpose, not one:
//
// - isReviewAccountEmail(email) — PERMANENT membership check, independent
//   of the on/off switch. Used everywhere EXCEPT the OTP send/verify
//   bypass itself: registration block, money-movement guard, transfer
//   pairing, audit logging. These two identities stay reserved and
//   protected even if APP_REVIEW_ACCOUNT_ENABLED is later flipped to
//   false — disabling the switch closes the login path, it does not
//   "unprotect" the account (a still-logged-in session / known device
//   could otherwise skip the OTP step entirely and keep operating).
//
// - isReviewAccountLoginBypassActive(email) — switch AND membership. Used
//   ONLY by OtpService for the actual fixed-code bypass. This is the "1
//   click disable" — flipping APP_REVIEW_ACCOUNT_ENABLED to anything but
//   'true' makes this false instantly, for every future and in-flight
//   OTP send/verify, with no deploy needed.
export const REVIEW_ACCOUNT_BLOCKED_MESSAGE = 'Fonksyon sa a pa disponib sou kont demonstrasyon an.';

export function isReviewAccountEnabled(): boolean {
  return process.env.APP_REVIEW_ACCOUNT_ENABLED === 'true';
}

function parseReviewAccountEmails(): string[] {
  return (process.env.APP_REVIEW_ACCOUNT_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

// compte A = reviewer (premye email nan lis la) — sèl kont script kredi
// solde test la touche.
export function getReviewAccountEmailA(): string | null {
  return parseReviewAccountEmails()[0] || null;
}

// compte B = destinatè — sèl lòt kont kont A gen dwa voye/resevwa lajan.
export function getReviewAccountEmailB(): string | null {
  return parseReviewAccountEmails()[1] || null;
}

export function isReviewAccountEmail(email?: string | null): boolean {
  if (!email) return false;
  return parseReviewAccountEmails().includes(email.trim().toLowerCase());
}

export function isReviewAccountLoginBypassActive(email?: string | null): boolean {
  return isReviewAccountEnabled() && isReviewAccountEmail(email);
}

export function getReviewAccountOtpCode(): string | null {
  return process.env.APP_REVIEW_OTP_CODE || null;
}

export function assertNotReviewAccount(email?: string | null): void {
  if (isReviewAccountEmail(email)) {
    throw new ForbiddenException(REVIEW_ACCOUNT_BLOCKED_MESSAGE);
  }
}

// Transfè ant 2 kont demo yo: otorize SÈLMAN si voyè a AK destinatè a
// TOULEDE nan lis la. Si se sèlman younn nan de yo (nenpòt direksyon —
// demo→reyèl oswa reyèl→demo), bloke ak menm mesaj 403 la. Yon vrè
// itilizatè pa dwe janm ka voye oswa resevwa lajan nan/soti yon kont demo.
export function assertDemoTransferAllowed(senderEmail?: string | null, recipientEmail?: string | null): void {
  const senderIsDemo = isReviewAccountEmail(senderEmail);
  const recipientIsDemo = isReviewAccountEmail(recipientEmail);
  if (senderIsDemo !== recipientIsDemo) {
    throw new ForbiddenException(REVIEW_ACCOUNT_BLOCKED_MESSAGE);
  }
}

export function isDemoToDemoTransfer(senderEmail?: string | null, recipientEmail?: string | null): boolean {
  return isReviewAccountEmail(senderEmail) && isReviewAccountEmail(recipientEmail);
}
