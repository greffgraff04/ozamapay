import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { isStaging } from '../config/app-env';
import { assertNoRealProviderCallInStaging, mockStrowalletResponse } from '../config/provider-mock';

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
  // 2 oct 2026 — FAZ 0 reparasyon: STROWALLET_PUBLIC_KEY pa menm kle ak
  // dashboard ziiropay a (konfime AN LIVE, wè strowallet.service.ts) — sèvis
  // sa a rele SÈLMAN ziiropay.com, kidonk li bezwen ZIIROPAY_PUBLIC_KEY.
  private readonly ZIIROPAY_PUBLIC_KEY: string;
  private isChecking = false;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.ZIIROPAY_PUBLIC_KEY = this.config.get<string>('ZIIROPAY_PUBLIC_KEY') ?? '';
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
    if (isStaging()) {
      return mockStrowalletResponse('fetch-nfccard-detail')?.response?.card_detail?.card_status;
    }
    assertNoRealProviderCallInStaging('ZiiroPay');
    // Trailing-slash/mode='live' PA touche isit la sou demand — menm egzansyon
    // ak checkHealth() nan strowallet.service.ts, tikè separe pou FAZ 0.
    const { data } = await axios.get(`${BASE_URL_ZIIROPAY}/fetch-nfccard-detail/`, {
      params: { public_key: this.ZIIROPAY_PUBLIC_KEY, mode: 'live', card_id: cardId },
      timeout: 10000,
    });
    return data?.response?.card_detail?.card_status;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkPending(): Promise<void> {
    if (isStaging()) {
      this.logger.log('[staging] checkPending sote — koupe pou staging.');
      return;
    }
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
