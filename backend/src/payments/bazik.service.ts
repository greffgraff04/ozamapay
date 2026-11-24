import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { createHmac, timingSafeEqual } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const BASE_URL = 'https://api.bazik.io';
const MASTER_ID = process.env.OZAMAPAY_MASTER_ID as string;

// Transactions older than this are checked by the catch-up cron (webhook may
// have been missed/delayed).
const STALE_CHECK_MINUTES = 5;
// Bazik's own redirectUrl is documented to expire after 30 min — 35 is a
// small safety buffer so we never cancel a link the client could still pay
// through.
const EXPIRE_AFTER_MINUTES = 35;
// Soft idempotency window for re-submitting the same deposit form (mirrors
// MonCashConnectService's 10-min window, widened a bit since Bazik's own
// link lives longer — see moncashconnect.service.ts createPaymentRequest()).
const IDEMPOTENCY_WINDOW_MINUTES = 25;
// Token cache safety margin before expiry.
const TOKEN_REFRESH_MARGIN_SECONDS = 60;

function clientFeeRate(): number {
  const raw = Number(process.env.BAZIK_CLIENT_FEE_RATE);
  return Number.isFinite(raw) && raw >= 0 ? raw : 0.06;
}

// ── Webhook signature — pure function, unit-testable without the HTTP layer ──
// docs/bazik-api.md §10: HMAC-SHA256 hex digest of "{timestamp}.{event_id}.{raw_body}"
// with the dedicated webhook secret (BAZIK_WEBHOOK_SECRET), timing-safe compare.
export function verifyBazikWebhookSignature(
  rawBody: Buffer | string,
  signature: string | undefined,
  timestamp: string | undefined,
  eventId: string | undefined,
  secret: string | undefined,
): boolean {
  if (!secret || !signature || !timestamp || !eventId) return false;
  const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
  const signingString = `${timestamp}.${eventId}.${bodyStr}`;
  const expected = createHmac('sha256', secret).update(signingString).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    // Buffer.from(signature) throws on malformed hex / length mismatch — not a match.
    return false;
  }
}

export type BazikOrderStatus = 'COMPLETED' | 'FAILED' | 'PENDING' | null;

@Injectable()
export class BazikService {
  private readonly logger = new Logger(BazikService.name);
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  // ── AUTH — POST /token, cached and renewed before expiry ───────────────────
  // Ambiguïté doc (voir docs/bazik-api.md §2 + rapport final) : la page
  // "Quick Start" montre {access_token, token_type, expires_in: 86400}, la
  // page "API Reference" (censée être la vraie) montre {success, token,
  // user_id, expires_at: <ms epoch>} — et le texte dit "1h" juste à côté d'un
  // champ qui dit "24h". On accepte les deux formes de champs pour ne pas
  // dépendre de laquelle Bazik sert réellement ; à vérifier empiriquement au
  // premier appel sandbox (voir rapport final).
  private async fetchToken(): Promise<{ token: string; expiresAt: number }> {
    const userID = process.env.BAZIK_USER_ID;
    const secretKey = process.env.BAZIK_SECRET_KEY;
    if (!userID || !secretKey) {
      throw new Error('BAZIK_USER_ID/BAZIK_SECRET_KEY pa konfigire — depo Bazik pa disponib.');
    }

    this.logger.log('[Bazik] BEFORE POST /token');
    const res = await fetch(`${BASE_URL}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userID, secretKey }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || (!data.access_token && !data.token)) {
      this.logger.error(`[Bazik] /token failed: HTTP ${res.status} — ${JSON.stringify(data).slice(0, 300)}`);
      throw new BadRequestException('Nou pa ka konekte ak Bazik kounye a. Tanpri eseye ankò pita.');
    }

    const token: string = data.access_token ?? data.token;
    // expires_in = relative seconds (quick-start shape) ; expires_at = absolute ms epoch (API reference shape).
    let expiresAt: number;
    if (typeof data.expires_at === 'number') {
      expiresAt = data.expires_at - TOKEN_REFRESH_MARGIN_SECONDS * 1000;
    } else {
      const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;
      expiresAt = Date.now() + (expiresIn - TOKEN_REFRESH_MARGIN_SECONDS) * 1000;
    }

    this.logger.log(`[Bazik] /token SUCCESS — expiresAt=${new Date(expiresAt).toISOString()}`);
    return { token, expiresAt };
  }

  private async getToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.token;
    }
    this.tokenCache = await this.fetchToken();
    return this.tokenCache.token;
  }

  // ── 1. CREATE PAYMENT — POST /moncash/token ─────────────────────────────────
  async createPaymentRequest(
    userId: string,
    amountHTG: number,
  ): Promise<{ paymentUrl: string; referenceId: string }> {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new BadRequestException('Wallet pa jwenn');

    // Idempotency — menm fòma ak MonCashConnectService.createPaymentRequest().
    const windowStart = new Date(Date.now() - IDEMPOTENCY_WINDOW_MINUTES * 60 * 1000);
    const existing = await this.prisma.transaction.findFirst({
      where: {
        receiverWalletId: wallet.id,
        type: 'TOPUP',
        status: 'PENDING',
        method: 'Bazik',
        createdAt: { gte: windowStart },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing?.description) {
      this.logger.log(`[Bazik] Idempotency hit for userId=${userId} — returning existing order`);
      return { paymentUrl: existing.description, referenceId: existing.reference };
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Itilizatè pa jwenn');

    const ourReferenceId = `bazik_${userId}_${Date.now()}`;
    const token = await this.getToken();
    const userID = process.env.BAZIK_USER_ID;

    this.logger.log(`[Bazik] BEFORE POST /moncash/token amount=${amountHTG} ref=${ourReferenceId}`);
    const res = await fetch(`${BASE_URL}/moncash/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        gdes: amountHTG,
        userID,
        referenceId: ourReferenceId,
        description: `Depo MonCash OZAMAPAY — ${amountHTG} HTG`,
        customerFullName: user.name || 'Kliyan OZAMAPAY',
        customerEmail: user.email,
        successUrl: `${process.env.FRONTEND_URL || 'https://ozamapay.com'}/dashboard`,
        errorUrl: `${process.env.FRONTEND_URL || 'https://ozamapay.com'}/dashboard`,
        webhookUrl: `${process.env.BACKEND_URL}/payments/bazik/webhook`,
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.redirectUrl || !data.orderId) {
      this.logger.error(`[Bazik] /moncash/token failed: HTTP ${res.status} — ${JSON.stringify(data).slice(0, 300)}`);
      throw new BadRequestException('Nou rankontre yon pwoblèm teknik. Tanpri eseye ankò pita oswa kontakte sipò OZAMAPAY.');
    }

    const orderId: string = data.orderId;
    const redirectUrl: string = data.redirectUrl;
    const fee = Math.round(amountHTG * clientFeeRate() * 100) / 100;
    const netAmount = Math.round((amountHTG - fee) * 100) / 100;

    try {
      await this.prisma.transaction.create({
        data: {
          reference: orderId,
          amount: amountHTG,
          netAmount,
          fee,
          type: 'TOPUP',
          status: 'PENDING',
          method: 'Bazik',
          title: `Depo MonCash (Bazik) — ${amountHTG} HTG`,
          description: redirectUrl,
          receiverWalletId: wallet.id,
        },
      });
    } catch (err: any) {
      this.logger.error(`[Bazik] createPaymentRequest DB error: ${err.message} (code: ${err.code})`);
      throw err;
    }

    this.logger.log(`[Bazik] Transaction PENDING created orderId=${orderId}`);
    return { paymentUrl: redirectUrl, referenceId: orderId };
  }

  // ── 2. STATUS CHECK — GET /order/{orderId} ──────────────────────────────────
  async checkOrderStatus(orderId: string): Promise<BazikOrderStatus> {
    try {
      const token = await this.getToken();
      const res = await fetch(`${BASE_URL}/order/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 429) {
        this.logger.warn(`[Bazik] GET /order/${orderId}: 429 rate-limited — retry next tick`);
        return null;
      }
      if (!res.ok) {
        this.logger.warn(`[Bazik] GET /order/${orderId}: HTTP ${res.status}`);
        return null;
      }

      const data = await res.json().catch(() => ({}));
      const raw: string = (data?.status ?? '').toString().toLowerCase();

      if (['successful', 'succeeded', 'completed'].includes(raw)) return 'COMPLETED';
      if (['failed', 'cancelled', 'canceled'].includes(raw)) return 'FAILED';
      if (raw === 'pending') return 'PENDING';

      this.logger.warn(`[Bazik] GET /order/${orderId}: unrecognised status "${raw}"`);
      return null;
    } catch (err: any) {
      this.logger.warn(`[Bazik] GET /order/${orderId} error: ${err.message}`);
      return null;
    }
  }

  // ── 3. WEBHOOK ENTRY POINT — always re-verifies via GET /order before crediting ──
  // Jamè kredite sou sèl pawòl webhook la — menm si siyati a bon, yon dènye
  // apèl GET /order/{orderId} konfime estati reyèl la anvan nenpòt kredi.
  async handleWebhookEvent(orderId: string): Promise<void> {
    if (!orderId) {
      this.logger.warn('[Bazik] webhook: no orderId in body — ignoring');
      return;
    }
    await this.reconcileOrder(orderId);
  }

  private async reconcileOrder(orderId: string): Promise<void> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { reference: orderId, method: 'Bazik' },
      include: { receiverWallet: true },
    });
    if (!transaction) {
      this.logger.warn(`[Bazik] reconcile: no transaction found for orderId=${orderId}`);
      return;
    }
    if (transaction.status !== 'PENDING') {
      this.logger.log(`[Bazik] reconcile: tx ${transaction.id} already ${transaction.status} — skipping`);
      return;
    }

    const status = await this.checkOrderStatus(orderId);
    this.logger.log(`[Bazik] reconcile orderId=${orderId} → status=${status ?? 'unknown'}`);

    if (status === 'COMPLETED') {
      await this.creditWallet(transaction.id);
    } else if (status === 'FAILED') {
      const updated = await this.prisma.transaction.updateMany({
        where: { id: transaction.id, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      if (updated.count > 0) {
        this.logger.log(`[Bazik] reconcile: tx ${transaction.id} CANCELLED (order ${status.toLowerCase()})`);
      }
    }
    // status PENDING or null (inconclusive) — leave as-is, next cron tick retries.
  }

  // ── 4. CREDIT — atomic claim + LedgerEntry (fixes the MoncashConnect gap) ──
  private async creditWallet(transactionId: string): Promise<void> {
    // Atomic claim: PENDING→PROCESSING, PgBouncer-safe (no Serializable session state).
    const claimed = await this.prisma.transaction.updateMany({
      where: { id: transactionId, status: 'PENDING' },
      data: { status: 'PROCESSING' },
    });
    if (claimed.count === 0) {
      this.logger.warn(`[Bazik] creditWallet: tx ${transactionId} already claimed — skipping`);
      return;
    }

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { receiverWallet: true },
    });
    if (!transaction?.receiverWallet) {
      this.logger.error(`[Bazik] creditWallet: tx ${transactionId} has no receiverWallet`);
      return;
    }
    if (!MASTER_ID) {
      this.logger.error('[Bazik] creditWallet: OZAMAPAY_MASTER_ID env var is not set — aborting');
      throw new Error('OZAMAPAY_MASTER_ID is not configured');
    }

    const netAmount = Number(transaction.netAmount);
    const fee = Number(transaction.fee);
    const userWalletId = transaction.receiverWallet.id;

    try {
      await this.prisma.$transaction(
        async (tx) => {
          const userWallet = await tx.wallet.findUnique({ where: { id: userWalletId } });
          const masterWallet = await tx.wallet.findFirst({ where: { userId: MASTER_ID } });
          if (!userWallet || !masterWallet) throw new Error('Wallet introuvable pendant le crédit Bazik');

          const userBefore = Number(userWallet.balance);
          const userAfter = Math.round((userBefore + netAmount) * 100) / 100;
          const masterBefore = Number(masterWallet.balance);
          const masterAfter = Math.round((masterBefore + fee) * 100) / 100;

          await tx.wallet.update({ where: { id: userWallet.id }, data: { balance: userAfter } });
          await tx.wallet.update({ where: { id: masterWallet.id }, data: { balance: masterAfter } });

          await tx.transaction.update({
            where: { id: transactionId },
            data: { status: 'COMPLETED' },
          });

          await tx.ledgerEntry.create({
            data: {
              walletId: userWallet.id,
              transactionId,
              type: 'CREDIT',
              amount: netAmount,
              balanceBefore: userBefore,
              balanceAfter: userAfter,
              description: `Depo MonCash (Bazik) kredite — ${transaction.amount} HTG brit, ${fee} HTG frè OZAMAPAY`,
            },
          });
          await tx.ledgerEntry.create({
            data: {
              walletId: masterWallet.id,
              transactionId,
              type: 'CREDIT',
              amount: fee,
              balanceBefore: masterBefore,
              balanceAfter: masterAfter,
              description: `Frè depo MonCash (Bazik) — tx ${transactionId}`,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err: any) {
      this.logger.error(`[Bazik] creditWallet: $transaction failed for tx ${transactionId}: ${err.message}`);
      try {
        await this.prisma.transaction.update({ where: { id: transactionId }, data: { status: 'PENDING' } });
        this.logger.log(`[Bazik] creditWallet: reverted tx ${transactionId} PROCESSING → PENDING for retry`);
      } catch (revertErr: any) {
        this.logger.error(`[Bazik] creditWallet: revert failed for tx ${transactionId}: ${revertErr.message}`);
      }
      throw err;
    }

    this.logger.log(`[Bazik] tx ${transactionId} COMPLETED — credited ${netAmount} HTG to user, ${fee} HTG fee to master`);

    const user = await this.prisma.user.findUnique({ where: { id: transaction.receiverWallet.userId } });
    if (user) {
      try {
        await this.mailService.sendTopupConfirmed(user.email, user.name ?? 'Kliyan', netAmount, 'MonCash');
      } catch {}
    }
  }

  // ── 5. CATCH-UP CRON — every 5 min ──────────────────────────────────────────
  // PA gen "isStaging() → skip" isit la kontrèman ak MonCashConnectService :
  // Bazik GEN yon vrè sandbox (idantifyan sèlman, pa gen URL separe — wè
  // docs/bazik-api.md §1/§11), e fonksyon sa a se SÈL kote l ap janm fè yon
  // bagay reyèl (gateway a rete "moncashconnect" pa defo an pwodiksyon, kidonk
  // pa gen okenn Transaction method=Bazik ki ka egziste la — cron la zewo-coût an pwodiksyon).
  @Cron('*/5 * * * *')
  async reconcilePendingPayments(): Promise<void> {
    const staleCutoff = new Date(Date.now() - STALE_CHECK_MINUTES * 60 * 1000);
    const expireCutoff = new Date(Date.now() - EXPIRE_AFTER_MINUTES * 60 * 1000);

    const stale = await this.prisma.transaction.findMany({
      where: {
        type: 'TOPUP',
        status: 'PENDING',
        method: 'Bazik',
        createdAt: { lte: staleCutoff },
      },
      select: { id: true, reference: true, createdAt: true },
    });

    if (stale.length === 0) return;
    this.logger.log(`[Bazik] cron: reconciling ${stale.length} stale PENDING transaction(s)`);

    for (const tx of stale) {
      try {
        await this.reconcileOrder(tx.reference);

        // Still PENDING after the status check above AND past the hard
        // expiry window (link is dead on Bazik's side) → give up.
        if (tx.createdAt <= expireCutoff) {
          const updated = await this.prisma.transaction.updateMany({
            where: { id: tx.id, status: 'PENDING' },
            data: { status: 'CANCELLED' },
          });
          if (updated.count > 0) {
            this.logger.log(`[Bazik] cron: expired tx ${tx.id} (orderId=${tx.reference}) — CANCELLED`);
          }
        }
      } catch (err: any) {
        this.logger.error(`[Bazik] cron: error reconciling tx ${tx.id}: ${err.message}`);
      }
    }
  }
}
