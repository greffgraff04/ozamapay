import { Injectable, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true, subscriptionExpiry: true },
    });
    if (!user) throw new BadRequestException('Itilizatè pa jwenn');
    const now = new Date();
    const isActive =
      user.subscriptionTier === 'VERIFIED' &&
      !!user.subscriptionExpiry &&
      user.subscriptionExpiry > now;
    return {
      tier: user.subscriptionTier,
      expiry: user.subscriptionExpiry,
      isActive,
    };
  }

  async upgrade(userId: string) {
    const PRICE = 500;
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet || Number(wallet.balance) < PRICE) {
      throw new BadRequestException('Balans ensifizan — ou bezwen omwen 500 HTG');
    }
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { userId },
        data: { balance: { decrement: PRICE } },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { subscriptionTier: 'VERIFIED', subscriptionExpiry: expiry },
      }),
    ]);
    return { success: true, tier: 'VERIFIED', expiry };
  }

  async cancel(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { subscriptionTier: 'FREE', subscriptionExpiry: null },
    });
    return { success: true, tier: 'FREE' };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkExpired() {
    const now = new Date();
    await this.prisma.user.updateMany({
      where: {
        subscriptionTier: 'VERIFIED',
        subscriptionExpiry: { lt: now },
      },
      data: { subscriptionTier: 'FREE', subscriptionExpiry: null },
    });
  }
}
