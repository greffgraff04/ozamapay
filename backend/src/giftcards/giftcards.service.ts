import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { Prisma, TransactionType, TransactionStatus, LedgerType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReloadlyAuthService } from '../reloadly/reloadly-auth.service';

const RELOADLY_BASE = 'https://giftcards.reloadly.com';
const GIFTCARDS_AUDIENCE = 'https://giftcards.reloadly.com';
const MARGIN = 0.05;
const MASTER_ID = process.env.OZAMAPAY_MASTER_ID as string;

@Injectable()
export class GiftCardsService {
  private readonly logger = new Logger(GiftCardsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reloadlyAuth: ReloadlyAuthService,
  ) {}

  // ─── HTTP helpers ─────────────────────────────────────────────────────────

  private async reloadlyGet(path: string) {
    const token = await this.reloadlyAuth.getToken(GIFTCARDS_AUDIENCE);
    const res = await fetch(`${RELOADLY_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/com.reloadly.giftcards-v1+json',
      },
    });
    if (!res.ok) throw new Error(`Reloadly GET ${path}: ${await res.text()}`);
    return res.json();
  }

  private async reloadlyPost(path: string, body: any) {
    const token = await this.reloadlyAuth.getToken(GIFTCARDS_AUDIENCE);
    const res = await fetch(`${RELOADLY_BASE}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/com.reloadly.giftcards-v1+json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Reloadly POST ${path}: ${await res.text()}`);
    return res.json();
  }

  // ─── Products ─────────────────────────────────────────────────────────────

  async getProducts(countryCode = 'US') {
    return this.reloadlyGet(`/products?countryCode=${countryCode}&size=200`);
  }

  async getProductById(productId: number) {
    return this.reloadlyGet(`/products/${productId}`);
  }

  // ─── Order ────────────────────────────────────────────────────────────────

  async orderGiftCard(userId: string, productId: number, unitPrice: number, quantity: number = 1) {
    // ── Garde-fous d'entrée — rejet avant même de toucher le catalogue ──────
    if (!Number.isInteger(productId) || productId <= 0) {
      throw new BadRequestException('productId envalid');
    }
    const priceCents = Math.round(unitPrice * 100);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0 || Math.abs(unitPrice * 100 - priceCents) > 1e-6) {
      throw new BadRequestException('unitPrice envalid — dwe pozitif ak maksimòm 2 chif apre pwen');
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      throw new BadRequestException('quantity envalid — dwe yon nonb antye ant 1 ak 10');
    }

    // Prix JAMAIS pris du client — on va toujours le rechercher/valider contre
    // le catalogue fournisseur avant de calculer quoi que ce soit. Si le
    // catalogue est inaccessible, on refuse la commande (fail closed) au lieu
    // d'avaler l'erreur comme avant (ancien try/catch silencieux).
    const product = await this.getProductById(productId);
    const productName = product?.productName ?? `Gift Card #${productId}`;
    const validatedUnitPrice = this.resolveCatalogPrice(product, unitPrice);

    const rateEntry = await this.prisma.rate.findUnique({ where: { key: 'USD_HTG' } });
    const exchangeRate = Number(rateEntry?.value ?? 140);
    const totalSenderCost = Math.round(validatedUnitPrice * quantity * 100) / 100;
    const htgCost = Math.round(totalSenderCost * exchangeRate * (1 + MARGIN) * 100) / 100;
    const marginHTG = Math.round(totalSenderCost * exchangeRate * MARGIN * 100) / 100;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Itilizatè pa jwenn');

    // 1 — Débit atomique conditionnel + création commande + audit trail (serializable)
    const { orderId, newBalance, transactionId } = await this.prisma.$transaction(async (tx) => {
      const walletMeta = await tx.wallet.findUnique({ where: { userId }, select: { id: true } });
      if (!walletMeta) throw new BadRequestException('Wallet pa jwenn');
      const masterWallet = await tx.wallet.findUnique({ where: { userId: MASTER_ID } });
      if (!masterWallet) throw new BadRequestException('Master wallet pa jwenn');

      // Débit conditionnel : la vérification de solde fait partie du WHERE de
      // l'UPDATE lui-même (pas d'étape lecture-puis-écriture séparée). Sous
      // charge concurrente, Postgres verrouille la ligne au niveau de l'UPDATE
      // — une seule des commandes simultanées peut gagner la course,
      // count === 0 pour toutes les autres ⇒ solde insuffisant.
      const debit = await tx.wallet.updateMany({
        where: { userId, balance: { gte: htgCost } },
        data: { balance: { decrement: htgCost } },
      });
      if (debit.count === 0) {
        throw new BadRequestException(`Balans ensifizan — bezwen ${htgCost} HTG`);
      }
      const updatedWallet = await tx.wallet.findUnique({ where: { userId } });
      if (!updatedWallet) throw new BadRequestException('Wallet pa jwenn');
      const balanceBeforeWallet = Prisma.Decimal.add(updatedWallet.balance, htgCost);

      const updatedMaster = await tx.wallet.update({
        where: { userId: MASTER_ID },
        data: { balance: { increment: marginHTG } },
      });
      const order = await tx.giftCardOrder.create({
        data: {
          userId,
          productId,
          productName,
          unitPrice: validatedUnitPrice,
          htgPaid: htgCost,
          status: 'PENDING',
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          reference: `GIFTCARD-${order.id}`,
          senderWalletId: walletMeta.id,
          receiverWalletId: masterWallet.id,
          amount: htgCost,
          fee: marginHTG,
          netAmount: htgCost - marginHTG,
          type: TransactionType.PAYMENT,
          status: TransactionStatus.PENDING,
          method: 'GIFTCARD',
          title: `Gift card ${productName}`,
          description: `Order ${order.id} — pwodwi #${productId} x${quantity}`,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          walletId: walletMeta.id,
          transactionId: transaction.id,
          type: LedgerType.DEBIT,
          amount: htgCost,
          balanceBefore: balanceBeforeWallet,
          balanceAfter: updatedWallet.balance,
          description: `Gift card order ${order.id}`,
        },
      });
      await tx.ledgerEntry.create({
        data: {
          walletId: masterWallet.id,
          transactionId: transaction.id,
          type: LedgerType.CREDIT,
          amount: marginHTG,
          balanceBefore: masterWallet.balance,
          balanceAfter: updatedMaster.balance,
          description: `Komisyon gift card order ${order.id}`,
        },
      });

      return { orderId: order.id, newBalance: updatedWallet.balance, transactionId: transaction.id };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    // 2 — Call Reloadly outside the DB transaction
    let redeemCode: string | null = null;
    let finalStatus = 'PROCESSING';

    try {
      const result = await this.reloadlyPost('/orders', {
        productId,
        countryCode: 'US',
        quantity,
        unitPrice: validatedUnitPrice,
        customIdentifier: orderId,
        senderName: 'OZAMAPAY',
        recipientEmail: user.email,
      });

      if (result.transactionId) {
        const cards = await this.reloadlyGet(`/orders/transactions/${result.transactionId}/cards`);
        redeemCode = cards?.[0]?.cardNumber ?? cards?.[0]?.pinCode ?? null;
      }
      finalStatus = redeemCode ? 'COMPLETED' : 'PROCESSING';
    } catch (err: any) {
      this.logger.error(`Reloadly order failed for orderId ${orderId}: ${err.message}`);
      await this.prisma.$transaction(async (tx) => {
        // Garde anti-double-ranbousman : si yon lòt chemen (egzanp webhook)
        // deja rezoud kòmand sa a, status la pa 'PENDING' ankò — nou sòti san
        // touche balans yo ankò. Kòd sa a se sèl andwa ki ka ranbouse apre yon
        // debi ki reyisi (orderId/transactionId pa egziste si debi a echwe).
        const current = await tx.giftCardOrder.findUnique({ where: { id: orderId } });
        if (!current || current.status !== 'PENDING') return;

        const revertedWallet = await tx.wallet.update({ where: { userId }, data: { balance: { increment: htgCost } } });
        const revertedMaster = await tx.wallet.update({ where: { userId: MASTER_ID }, data: { balance: { decrement: marginHTG } } });
        await tx.giftCardOrder.update({ where: { id: orderId }, data: { status: 'FAILED' } });
        await tx.transaction.update({ where: { id: transactionId }, data: { status: TransactionStatus.FAILED } });
        await tx.ledgerEntry.create({
          data: {
            walletId: revertedWallet.id,
            transactionId,
            type: LedgerType.CREDIT,
            amount: htgCost,
            balanceBefore: Prisma.Decimal.sub(revertedWallet.balance, htgCost),
            balanceAfter: revertedWallet.balance,
            description: `Ranbousman gift card order ${orderId} — echèk founisè`,
          },
        });
        await tx.ledgerEntry.create({
          data: {
            walletId: revertedMaster.id,
            transactionId,
            type: LedgerType.DEBIT,
            amount: marginHTG,
            balanceBefore: Prisma.Decimal.add(revertedMaster.balance, marginHTG),
            balanceAfter: revertedMaster.balance,
            description: `Ranbousman komisyon gift card order ${orderId} — echèk founisè`,
          },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      throw new BadRequestException('Nou rankontre yon pwoblèm teknik. Tanpri eseye ankò pita oswa kontakte sipò OZAMAPAY.');
    }

    await this.prisma.giftCardOrder.update({
      where: { id: orderId },
      data: { redeemCode: redeemCode ?? undefined, status: finalStatus },
    });
    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { status: finalStatus === 'COMPLETED' ? TransactionStatus.COMPLETED : TransactionStatus.PROCESSING },
    });

    return {
      orderId,
      productName,
      unitPrice: validatedUnitPrice,
      quantity,
      htgPaid: htgCost,
      redeemCode,
      status: finalStatus,
      newBalance,
    };
  }

  // ─── Validation prix catalogue ────────────────────────────────────────────
  // Jamè fè konfyans nan pri yo bay nan kliyan an — valide/aliyen li ak
  // katalòg Reloadly la anvan nenpòt kalkil oswa debi balans.
  //
  // Devise : unitPrice se toujou yon montan SENDER (devise facturasyon
  // OZAMAPAY↔Reloadly, souvan USD men pa toujou — gen pwodwi EUR). Se sa
  // webapp lan deja voye (frontend/app/dashboard/gifts/[productId]/page.tsx:48,
  // 61-70, li li minSenderDenomination/fixedSenderDenominations pou bati
  // `buyAmount`) e se sa Reloadly POST /orders.unitPrice espere tou. Chemen
  // prensipal la validè kont chan SENDER yo. Si yon pwodwi pa ekspoze chan
  // SENDER (ka ki pa konfime nan done aktyèl yo), nou tonbe tounen sou
  // RECIPIENT + fixedRecipientToSenderDenominationsMap pou konvèti an SENDER
  // anvan okenn kalkil — webapp aktyèl la pa chanje paske li toujou voye yon
  // valè SENDER, ki ap toujou matche chemen prensipal la.
  private resolveCatalogPrice(product: any, clientUnitPrice: number): number {
    const isRangeType =
      product?.denominationType === 'RANGE' ||
      (product?.senderFaceValue == null && product?.minSenderDenomination != null);
    const hasSenderRange = product?.minSenderDenomination != null && product?.maxSenderDenomination != null;
    const hasSenderFixed =
      (Array.isArray(product?.fixedSenderDenominations) && product.fixedSenderDenominations.length > 0) ||
      product?.senderFaceValue != null;

    if (isRangeType && hasSenderRange) {
      const min = Number(product.minSenderDenomination);
      const max = Number(product.maxSenderDenomination);
      if (!Number.isFinite(min) || !Number.isFinite(max)) {
        throw new BadRequestException('Pa ka valide pri pwodwi sa a kounye a');
      }
      if (clientUnitPrice < min || clientUnitPrice > max) {
        throw new BadRequestException(`Pri envalid — dwe ant ${min} ak ${max}`);
      }
      return clientUnitPrice;
    }

    if (!isRangeType && hasSenderFixed) {
      const allowed: number[] = Array.isArray(product.fixedSenderDenominations) && product.fixedSenderDenominations.length
        ? product.fixedSenderDenominations.map(Number)
        : [Number(product.senderFaceValue)];
      const match = allowed.find((v) => Number.isFinite(v) && Math.abs(v - clientUnitPrice) < 0.01);
      if (match === undefined) {
        throw new BadRequestException('Pri envalid pou pwodwi sa a');
      }
      return match;
    }

    // Chemen segondè — pwodwi san chan SENDER, sèlman RECIPIENT + mapping.
    const map = product?.fixedRecipientToSenderDenominationsMap;
    if (map && typeof map === 'object') {
      const key = Object.keys(map).find((k) => Number(k) === clientUnitPrice);
      if (key !== undefined) {
        const senderValue = Number(map[key]);
        if (Number.isFinite(senderValue) && senderValue > 0) return senderValue;
      }
    }

    throw new BadRequestException(
      'Pa ka valide pri pwodwi sa a — okenn done SENDER ou mapping disponib nan katalòg la',
    );
  }

  // ─── History ──────────────────────────────────────────────────────────────

  async getOrderReloadly(transactionId: string) {
    return this.reloadlyGet(`/orders/transactions/${transactionId}/cards`);
  }

  async getUserOrders(userId: string) {
    return this.prisma.giftCardOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  // ─── Webhook ──────────────────────────────────────────────────────────────

  verifyWebhookSignature(rawBody: string, signature: string, timestamp: string): boolean {
    const secret = process.env.RELOADLY_WEBHOOK_SECRET;
    if (!secret || !signature || !timestamp) return false;
    const dataToSign = rawBody + ':' + timestamp;
    const expected = createHmac('sha256', secret).update(dataToSign).digest('hex');
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(signature.trim()));
    } catch {
      return false;
    }
  }

  async processWebhook(body: any): Promise<void> {
    const { event, status, transaction } = body ?? {};

    if (event !== 'giftcard_transaction.status') return;

    const customId: string | undefined = transaction?.customIdentifier;
    const reloadlyTxId: number | undefined = transaction?.id;

    if (!customId) {
      this.logger.warn('Reloadly webhook: missing customIdentifier');
      return;
    }

    const order = await this.prisma.giftCardOrder.findUnique({ where: { id: customId } });
    if (!order) {
      this.logger.warn(`Reloadly webhook: GiftCardOrder not found for id=${customId}`);
      return;
    }

    if (order.status === 'COMPLETED' || order.status === 'FAILED') return;

    if (status === 'SUCCESSFUL') {
      let redeemCode: string | null = null;
      if (reloadlyTxId) {
        try {
          const cards = await this.reloadlyGet(`/orders/transactions/${reloadlyTxId}/cards`);
          redeemCode = cards?.[0]?.cardNumber ?? cards?.[0]?.pinCode ?? null;
        } catch (err: any) {
          this.logger.warn(`Could not fetch redeem code for tx ${reloadlyTxId}: ${err.message}`);
        }
      }
      await this.prisma.giftCardOrder.update({
        where: { id: order.id },
        data: { status: 'COMPLETED', redeemCode: redeemCode ?? undefined },
      });
      this.logger.log(`GiftCardOrder ${order.id} → COMPLETED`);
    } else if (status === 'FAILED') {
      const htgPaid = Number(order.htgPaid);
      const marginHTG = Math.round((htgPaid * MARGIN) / (1 + MARGIN) * 100) / 100;

      await this.prisma.$transaction(async (tx) => {
        const current = await tx.giftCardOrder.findUnique({ where: { id: order.id } });
        if (!current || current.status === 'COMPLETED' || current.status === 'FAILED') return;

        await tx.wallet.update({
          where: { userId: order.userId },
          data: { balance: { increment: htgPaid } },
        });
        await tx.wallet.update({
          where: { userId: MASTER_ID },
          data: { balance: { decrement: marginHTG } },
        });
        await tx.giftCardOrder.update({
          where: { id: order.id },
          data: { status: 'FAILED' },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      this.logger.log(`GiftCardOrder ${order.id} → FAILED, refunded ${htgPaid} HTG to user`);
    }
  }
}
