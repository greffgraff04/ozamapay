import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ACTIVATION_THRESHOLD_ENABLED,
  ACTIVATION_THRESHOLD_HTG,
  ACTIVATION_THRESHOLD_START_DATE,
  ACTIVATION_BLOCKED_MESSAGE,
} from '../common/constants';

type ActivationSubject = {
  createdAt: Date;
  kyc: { status: string } | null;
  wallet: { balance: unknown } | null;
};

// Pwen santral SÈL kote règ "kont konsène pa sèy aktivasyon an" defini —
// tout lòt kote (guard, apèl enline nan wallet/kyc/strowallet/bsicards/
// giftcards) rele metòd sa yo, pa reimplemente lojik la.
@Injectable()
export class ActivationService {
  constructor(private readonly prisma: PrismaService) {}

  private async loadSubject(userId: string): Promise<ActivationSubject | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        createdAt: true,
        kyc: { select: { status: true } },
        wallet: { select: { balance: true } },
      },
    });
  }

  // Sèlman kont KREYE APRE ACTIVATION_THRESHOLD_START_DATE, SAN KYC APPROVED
  // (Manm Fondatè ak nenpòt lòt kont ki deja APPROVED pa janm konsène — menm
  // si yo ta kreye apre dat la). San flag la oswa san dat konfigire, AUCUN
  // kont pa konsène — defo an sekirite.
  isSubjectToThreshold(user: ActivationSubject): boolean {
    if (!ACTIVATION_THRESHOLD_ENABLED) return false;
    if (!ACTIVATION_THRESHOLD_START_DATE) return false;
    if (user.createdAt < ACTIVATION_THRESHOLD_START_DATE) return false;
    if (user.kyc?.status === 'APPROVED') return false;
    return true;
  }

  isActivated(user: ActivationSubject): boolean {
    if (!this.isSubjectToThreshold(user)) return true;
    return Number(user.wallet?.balance ?? 0) >= ACTIVATION_THRESHOLD_HTG;
  }

  async assertActivated(userId: string): Promise<void> {
    const user = await this.loadSubject(userId);
    if (!user) return; // itilizatè pa jwenn — pa konsène sèy sa a, lòt gad okipe kont sa a
    if (!this.isActivated(user)) {
      throw new ForbiddenException(ACTIVATION_BLOCKED_MESSAGE);
    }
  }

  async getStatus(userId: string) {
    const user = await this.loadSubject(userId);
    const isSubjectToThreshold = user ? this.isSubjectToThreshold(user) : false;
    const currentBalanceHtg = user ? Number(user.wallet?.balance ?? 0) : 0;
    const isActivated = user ? this.isActivated(user) : true;
    const missingHtg = isSubjectToThreshold && !isActivated
      ? Math.max(0, ACTIVATION_THRESHOLD_HTG - currentBalanceHtg)
      : 0;
    // Depo 6% frè — montan brit pou jwenn exakteman missingHtg net apre frè.
    const grossDepositEstimateHtg = missingHtg > 0 ? Math.ceil(missingHtg / 0.94) : 0;

    return {
      activationThresholdEnabled: ACTIVATION_THRESHOLD_ENABLED,
      thresholdHtg: ACTIVATION_THRESHOLD_HTG,
      isSubjectToThreshold,
      currentBalanceHtg,
      isActivated,
      missingHtg,
      grossDepositEstimateHtg,
    };
  }
}
