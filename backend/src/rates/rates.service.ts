import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AlertCooldownService } from '../common/alert-cooldown/alert-cooldown.service';
import { isStaging } from '../config/app-env';

// Fouchèt reyalis pou valè yon to chanj (HTG pou 1 inite lòt devise). Tout
// valè aktyèl yo (USD_HTG, EUR_HTG, USDT_HTG, CARD_RATE) ap antre 130-155 —
// bòn sa yo kite plas pou depresyasyon gourd futur enpòtan san kite yon dwa
// zewo anplis (ex: 1350 olye 135) oswa yon valè kraze (0, negatif) tonbe
// nan baz done a san kontwòl, sa ki t ap korupye tout konvèsyon nan platfòm lan.
const MIN_RATE_VALUE = 1;
const MAX_RATE_VALUE = 1000;

// L7 — staging (ozamapay_staging) pa gen `prisma db seed` nan buildCommand
// li (sèlman prod genyen), donk tab Rate a rete vid apre migrate deploy.
// Valè sa yo kopye an LEKTI SÈLMAN depi prod (ozamapay-backend) le
// 2026-10-23 — PA yon nouvo desizyon biznis. CREATE sèlman si absan — pa
// janm ekraze yon valè admin te deja antre sou staging.
const STAGING_SEED_RATES: Record<string, number> = {
  USD_HTG: 135,
  EUR_HTG: 152,
};

@Injectable()
export class RatesService implements OnModuleInit {
  private readonly logger = new Logger(RatesService.name);
  private readonly STALE_DAYS = 3; // suggested default — confirm cadence with COO

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private alertCooldown: AlertCooldownService,
  ) {}

  async onModuleInit() {
    if (!isStaging()) return;
    for (const [key, value] of Object.entries(STAGING_SEED_RATES)) {
      const existing = await this.prisma.rate.findUnique({ where: { key } });
      if (!existing) {
        await this.prisma.rate.create({ data: { key, value, currency: 'HTG' } });
        this.logger.log(`[staging] seed Rate ${key}=${value} (pa t egziste)`);
      }
    }
  }

  async getAllRates() {
    return this.prisma.rate.findMany();
  }

  async getRateHistory(pair?: string) {
    return this.prisma.exchangeRateHistory.findMany({
      where: pair ? { pair } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRate(key: string, value: number, adminId: string) {
    if (typeof key !== 'string' || !key.trim()) {
      throw new BadRequestException('Kle to a obligatwa');
    }
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
      throw new BadRequestException('Valè to a envalid — dwe yon nonb pozitif');
    }
    if (n < MIN_RATE_VALUE || n > MAX_RATE_VALUE) {
      throw new BadRequestException(
        `Valè to a andeyò fouchèt reyalis (${MIN_RATE_VALUE}-${MAX_RATE_VALUE})`,
      );
    }

    const [rate] = await this.prisma.$transaction([
      this.prisma.rate.upsert({ where: { key }, update: { value }, create: { key, value } }),
      this.prisma.exchangeRateHistory.create({ data: { pair: key, rate: value } }),
      this.prisma.adminActionLog.create({
        data: { adminId, action: 'RATE_UPDATED', targetType: 'Rate', details: `${key} → ${value}` },
      }),
    ]);
    return rate;
  }

  // Chak to nan tab Rate riske rete estal san pesonn pa remake l — sa a se
  // egzakteman sa k te rive ak USD_HTG (135 depi 2 jiyè, 8 semèn san chanje,
  // san alèt). Rapèl chak jou pou tout to yo, pa sèlman USD_HTG. Cron lan deja
  // 1x/jou, men cooldown la ajoute pou konsistans ak lòt alèt yo epi pwoteje
  // si cadans cron lan ta chanje pita.
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkRateStaleness() {
    if (isStaging()) {
      this.logger.log('[staging] checkRateStaleness sote — koupe pou staging.');
      return;
    }
    const rates = await this.prisma.rate.findMany();
    const staleMs = this.STALE_DAYS * 24 * 60 * 60 * 1000;
    for (const rate of rates) {
      if (Date.now() - rate.updatedAt.getTime() > staleMs) {
        const canSend = await this.alertCooldown.shouldSend(`rate-stale:${rate.key}`);
        if (canSend) {
          await this.mailService.sendRateStaleAlert(rate.key, Number(rate.value), rate.updatedAt);
        }
      }
    }
  }
}