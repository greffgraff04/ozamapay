import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  RENAISSANCE_PRICING_ENABLED,
  CARD_CREATION_FEE_HTG,
  CARD_INITIAL_BALANCE_USD,
  ACTIVATION_THRESHOLD_ENABLED,
  ACTIVATION_THRESHOLD_HTG,
} from '../common/constants';
import { ActivationService } from '../activation/activation.service';

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activationService: ActivationService,
  ) {}

  // Pa gen userId (pa konekte) — defo "pa konsène" san rele BDD a.
  private readonly DEFAULT_ACTIVATION_STATUS = {
    activationThresholdEnabled: ACTIVATION_THRESHOLD_ENABLED,
    thresholdHtg: ACTIVATION_THRESHOLD_HTG,
    isSubjectToThreshold: false,
    currentBalanceHtg: 0,
    isActivated: true,
    missingHtg: 0,
    grossDepositEstimateHtg: 0,
  };

  // Pri aktyèl KYC/kat, selon RENAISSANCE_PRICING_ENABLED. isFounderFreeCard
  // kalkile pou itilizatè konekte a sèlman (null si pa gen userId — flag
  // dezaktive pa bezwen l, e konsèp "manm fondatè" pa egziste san flag la).
  // Estati sèy aktivasyon (ACTIVATION_THRESHOLD_ENABLED) ajoute san rapò ak
  // RENAISSANCE_PRICING_ENABLED — 2 flag endepandan.
  async getPricing(userId?: string) {
    const activationStatus = userId
      ? await this.activationService.getStatus(userId)
      : this.DEFAULT_ACTIVATION_STATUS;

    if (!RENAISSANCE_PRICING_ENABLED) {
      return {
        renaissancePricingEnabled: false,
        kycFeeHtg: 3375,
        kycFeeUsd: 25,
        cardCreationFeeHtg: 0,
        cardInitialBalanceUsd: null,
        isFounderFreeCard: false,
        ...activationStatus,
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
      ...activationStatus,
    };
  }
}
