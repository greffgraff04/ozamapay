import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class RatesService {
  private readonly STALE_DAYS = 3; // suggested default — confirm cadence with COO

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

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
  // san alèt). Rapèl chak jou pou tout to yo, pa sèlman USD_HTG.
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkRateStaleness() {
    const rates = await this.prisma.rate.findMany();
    const staleMs = this.STALE_DAYS * 24 * 60 * 60 * 1000;
    for (const rate of rates) {
      if (Date.now() - rate.updatedAt.getTime() > staleMs) {
        await this.mailService.sendRateStaleAlert(rate.key, Number(rate.value), rate.updatedAt);
      }
    }
  }
}