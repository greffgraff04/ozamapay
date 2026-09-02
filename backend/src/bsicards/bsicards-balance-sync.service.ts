import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { BSICardsMastercardEuroService } from './bsicards-mastercard-euro.service';

const PROVIDER = 'BSICARDS_MASTERCARD_EUR';
const DRIFT_TOLERANCE_EUR = 0.01; // evite fo-pozitif ki soti nan awondi Decimal

// Mekanis TANPORÈ pandan n ap tann konfimasyon webhook BSICards fonksyone pou
// vre (2 sept 2026 — konfime jodi a: zewo evènman webhook resevwa, pa gen
// mekanis pou nou ba BSICards URL nou an). Chak 10 minit, re-verifye vrè
// balans BSICards pou CHAK kat Mastercard EUR ak senkwonize si li "drift" —
// menm apwòch ak koreksyon manyèl yo te fè jodi a
// (resync-montfleury-bsicards-eur-balance-display.ts): SET balans lokal la a
// vrè valè a (pa additif), kreye Transaction+LedgerEntry $0 pou tras odit
// (pa gen chaj/ranbousman — se yon refresh afichaj sèlman). Retire cron sa a
// yon fwa webhook la konfime ap fonksyone.
@Injectable()
export class BSICardsBalanceSyncService {
  private readonly logger = new Logger(BSICardsBalanceSyncService.name);
  private isSyncing = false;

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private bsicardsEuroService: BSICardsMastercardEuroService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncAllBalances(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const cards = await this.prisma.virtualCard.findMany({
        where: { provider: PROVIDER, status: { in: ['ACTIVE', 'FROZEN'] } },
        include: { user: true },
      });

      const drifts: { cardId: string; email: string; name: string | null; oldBalance: number; newBalance: number; diff: number }[] = [];

      for (const card of cards) {
        try {
          const liveBalance = await this.bsicardsEuroService.getCardBalance(card.user.email, card.cardId);
          const localBalance = Number(card.balance);
          const diff = Math.abs(liveBalance - localBalance);
          if (diff <= DRIFT_TOLERANCE_EUR) continue;

          await this.prisma.$transaction(async (tx) => {
            await tx.virtualCard.update({
              where: { cardId: card.cardId },
              data: { balance: liveBalance },
            });

            const wallet = await tx.wallet.findFirst({ where: { userId: card.userId } });

            const transaction = await tx.transaction.create({
              data: {
                reference: `BSICARDS-EUR-AUTO-SYNC-${card.cardId}-${Date.now()}`,
                senderWalletId: wallet?.id,
                amount: 0,
                fee: 0,
                netAmount: 0,
                type: 'CARD',
                status: 'COMPLETED',
                title: 'Senkwonizasyon otomatik balans kat Mastercard EUR',
                description: `VirtualCard.balance senkwonize otomatikman ak vrè balans BSICards (€${localBalance.toFixed(2)} → €${liveBalance.toFixed(2)}) — cron tanporè, pa gen mouvman lajan.`,
              },
            });

            if (wallet) {
              await tx.ledgerEntry.create({
                data: {
                  walletId: wallet.id,
                  transactionId: transaction.id,
                  type: 'CREDIT',
                  amount: 0,
                  balanceBefore: wallet.balance,
                  balanceAfter: wallet.balance,
                  description: `Senkwonizasyon otomatik balans kat BSICards EUR (${card.cardId}) — pa gen chanjman nan wallet`,
                },
              });
            }
          }, { isolationLevel: 'Serializable' });

          this.logger.log(`[BSICardsBalanceSync] cardId=${card.cardId} €${localBalance} → €${liveBalance}`);
          drifts.push({ cardId: card.cardId, email: card.user.email, name: card.user.name, oldBalance: localBalance, newBalance: liveBalance, diff });
        } catch (err: any) {
          this.logger.error(`[BSICardsBalanceSync] Echèk pou cardId=${card.cardId}: ${err.message}`);
        }
      }

      if (drifts.length > 0) {
        await this.mailService.sendBsicardsBalanceDriftAlert(drifts).catch((err: any) =>
          this.logger.error(`[BSICardsBalanceSync] Alèt email echwe: ${err.message}`),
        );
      }
    } catch (err: any) {
      this.logger.error(`[BSICardsBalanceSync] Sik konplè echwe: ${err.message}`);
    } finally {
      this.isSyncing = false;
    }
  }
}
