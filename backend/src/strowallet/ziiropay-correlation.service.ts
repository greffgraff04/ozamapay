import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

const CHECK_DELAY_MS = 15 * 60 * 1000;
const BASE_URL_ZIIROPAY = 'https://ziiropay.com/api/bitvcard';

// Migrasyon ZiiroPay (sept 2026) — kontrèman ak strowallet.com, ziiropay.com
// pa gen webhook pou freeze/unfreeze e pa gen evènman "withdraw" separe.
// Sèvis sa a kreye yon "chèk atann" apre chak operasyon fund/freeze/unfreeze
// ki route sou ziiropay.com, epi verifye 15 min apre — FUND kont CardTransaction
// (ki soti nan webhook strowallet.com egzistan an, INCHANJE), FREEZE/UNFREEZE
// via yon poll-verify dirèk sou ziiropay.com. Log yon WARNING klè si operasyon
// an pa konfime — jamè echwe an silans.
@Injectable()
export class ZiiropayCorrelationService {
  private readonly logger = new Logger(ZiiropayCorrelationService.name);
  private readonly PUBLIC_KEY: string;
  private isChecking = false;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.PUBLIC_KEY = this.config.get<string>('STROWALLET_PUBLIC_KEY') ?? '';
  }

  async recordExpectedFundConfirmation(cardId: string, userId: string, amountUsd: number): Promise<void> {
    await this.prisma.ziiropayOperationCheck.create({
      data: {
        cardId,
        userId,
        operationType: 'FUND',
        expectedValue: String(amountUsd),
        checkAfter: new Date(Date.now() + CHECK_DELAY_MS),
      },
    });
  }

  async recordExpectedStatusChange(
    cardId: string,
    userId: string,
    operationType: 'FREEZE' | 'UNFREEZE',
    expectedStatus: 'frozen' | 'active',
  ): Promise<void> {
    await this.prisma.ziiropayOperationCheck.create({
      data: {
        cardId,
        userId,
        operationType,
        expectedValue: expectedStatus,
        checkAfter: new Date(Date.now() + CHECK_DELAY_MS),
      },
    });
  }

  private async fetchZiiropayCardStatus(cardId: string): Promise<string | undefined> {
    const { data } = await axios.get(`${BASE_URL_ZIIROPAY}/fetch-nfccard-detail/`, {
      params: { public_key: this.PUBLIC_KEY, mode: 'live', card_id: cardId },
      timeout: 10000,
    });
    return data?.response?.card_detail?.card_status;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkPending(): Promise<void> {
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      const pending = await this.prisma.ziiropayOperationCheck.findMany({
        where: { resolvedAt: null, checkAfter: { lt: new Date() } },
      });

      for (const check of pending) {
        try {
          if (check.operationType === 'FUND') {
            await this.checkFund(check);
          } else {
            await this.checkStatusChange(check);
          }
        } catch (err: any) {
          this.logger.error(`[ZiiropayCorrelation] Echèk verifikasyon id=${check.id} cardId=${check.cardId}: ${err.message}`);
        }
      }
    } catch (err: any) {
      this.logger.error(`[ZiiropayCorrelation] Sik konplè echwe: ${err.message}`);
    } finally {
      this.isChecking = false;
    }
  }

  private async checkFund(check: { id: string; cardId: string; expectedValue: string | null; createdAt: Date }): Promise<void> {
    const match = await this.prisma.cardTransaction.findFirst({
      where: { cardId: check.cardId, type: 'TOPUP', occurredAt: { gte: check.createdAt } },
    });

    if (match) {
      await this.prisma.ziiropayOperationCheck.update({ where: { id: check.id }, data: { resolvedAt: new Date() } });
      return;
    }

    this.logger.warn(
      `[ZiiropayCorrelation] FUND san konfimasyon webhook apre 15min — cardId=${check.cardId} amount=$${check.expectedValue}`,
    );
  }

  private async checkStatusChange(check: { id: string; cardId: string; expectedValue: string | null }): Promise<void> {
    const status = await this.fetchZiiropayCardStatus(check.cardId);

    if (status && check.expectedValue && status.toLowerCase() === check.expectedValue.toLowerCase()) {
      await this.prisma.ziiropayOperationCheck.update({ where: { id: check.id }, data: { resolvedAt: new Date() } });
      return;
    }

    this.logger.warn(
      `[ZiiropayCorrelation] FREEZE/UNFREEZE pa konfime apre 15min — cardId=${check.cardId} atann="${check.expectedValue}" jwenn="${status}"`,
    );
  }
}
