import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  RENAISSANCE_PRICING_ENABLED,
  CARD_CREATION_FEE_HTG,
  CARD_INITIAL_BALANCE_USD,
} from '../common/constants';

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  // Pri aktyèl KYC/kat, selon RENAISSANCE_PRICING_ENABLED. isFounderFreeCard
  // kalkile pou itilizatè konekte a sèlman (null si pa gen userId — flag
  // dezaktive pa bezwen l, e konsèp "manm fondatè" pa egziste san flag la).
  async getPricing(userId?: string) {
    if (!RENAISSANCE_PRICING_ENABLED) {
      return {
        renaissancePricingEnabled: false,
        kycFeeHtg: 3375,
        kycFeeUsd: 25,
        cardCreationFeeHtg: 0,
        cardInitialBalanceUsd: null,
        isFounderFreeCard: false,
      };
    }

    let isFounderFreeCard = false;
    if (userId) {
      const anyCardEver = await this.prisma.virtualCard.findFirst({ where: { userId } });
      if (!anyCardEver) {
        const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
        if (wallet) {
          const paidOldKyc = await this.prisma.transaction.findFirst({
            where: { title: 'Frè KYC', senderWalletId: wallet.id },
          });
          isFounderFreeCard = !!paidOldKyc;
        }
      }
    }

    return {
      renaissancePricingEnabled: true,
      kycFeeHtg: 0,
      kycFeeUsd: 0,
      cardCreationFeeHtg: isFounderFreeCard ? 0 : CARD_CREATION_FEE_HTG,
      cardInitialBalanceUsd: CARD_INITIAL_BALANCE_USD,
      isFounderFreeCard,
    };
  }
}
