import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CardStatus, TransactionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from '../auth/auth.service';
import { OtpService } from '../auth/otp.service';
import { isStaging } from '../config/app-env';
import { RequestAccountDeletionDto } from './dto/account-deletion.dto';

// Plan endpoints-app, lo L4 — exigence App Store/Play Store. Fenèt gras
// 48h, AUCUNE anonymizasyon/sipresyon fizik — sèlman yon flag ki bloke
// login apre egzekisyon. Transaction/LedgerEntry/Kyc pa touche JAMÈ isit la.
const ACCOUNT_DELETION_GRACE_HOURS = 48;

// Dire retansyon legal apre egzekisyon — pa aplike toujou (pa gen job
// pij/anonymizasyon ki itilize valè sa a kounye a), sèlman dokimante pou
// pwochen etap la. *** À VALIDER PAR LE JURIDIQUE (Me Vercy) *** anvan
// nenpòt job pij reyèl itilize l.
export const ACCOUNT_DELETION_LEGAL_RETENTION_DAYS_PROVISIONAL = 1825; // À VALIDER PAR LE JURIDIQUE

const BLOCKED_MESSAGE =
  'Ou gen yon solde oswa yon operasyon ap trete — retire lajan an ' +
  '(wallet/kat) oswa tann operasyon an fini anvan ou mande sipresyon kont ou. ' +
  'Si w bezwen èd, kontakte sipò.\n' +
  'Vous avez un solde ou une opération en cours — retirez les fonds (wallet/carte) ' +
  'ou attendez la fin de l\'opération avant de demander la suppression de votre compte. ' +
  'Si besoin, contactez le support.';

const ACTIVE_CARD_STATUSES: CardStatus[] = ['ACTIVE', 'FROZEN', 'PENDING_RECHARGE'];
const PENDING_TX_STATUSES: TransactionStatus[] = ['PENDING', 'PROCESSING'];

@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
  ) {}

  private async assertNoBlockers(userId: string, user: any): Promise<void> {
    if (user.wallet && Number(user.wallet.balance) > 0) throw new ConflictException(BLOCKED_MESSAGE);
    if (user.agent?.wallet && Number(user.agent.wallet.balance) > 0) {
      throw new ConflictException(BLOCKED_MESSAGE);
    }

    const activeCardWithBalance = await this.prisma.virtualCard.findFirst({
      where: { userId, status: { in: ACTIVE_CARD_STATUSES }, balance: { gt: 0 } },
    });
    if (activeCardWithBalance) throw new ConflictException(BLOCKED_MESSAGE);

    if (user.wallet) {
      const pendingTx = await this.prisma.transaction.findFirst({
        where: {
          status: { in: PENDING_TX_STATUSES },
          OR: [{ senderWalletId: user.wallet.id }, { receiverWalletId: user.wallet.id }],
        },
      });
      if (pendingTx) throw new ConflictException(BLOCKED_MESSAGE);
    }

    const pendingService = await this.prisma.serviceRequest.findFirst({
      where: { userId, status: { in: PENDING_TX_STATUSES } },
    });
    if (pendingService) throw new ConflictException(BLOCKED_MESSAGE);

    const pendingCardCreation = await this.prisma.cardCreationPending.findFirst({
      where: { userId, resolvedAt: null },
    });
    if (pendingCardCreation) throw new ConflictException(BLOCKED_MESSAGE);
  }

  private toStatusDto(req: {
    status: string;
    requestedAt: Date;
    scheduledFor: Date;
    cancelledAt: Date | null;
    executedAt: Date | null;
  }) {
    return {
      status: req.status,
      requestedAt: req.requestedAt,
      scheduledFor: req.scheduledFor,
      cancelledAt: req.cancelledAt,
      executedAt: req.executedAt,
    };
  }

  async requestDeletion(userId: string, dto: RequestAccountDeletionDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true, agent: { include: { wallet: true } } },
    });
    if (!user) throw new NotFoundException('Itilizatè sa a pa egziste.');

    // Re-otantifikasyon — mo pas OSWA kòd OTP, youn obligatwa.
    if (dto.otpCode) {
      await this.otpService.verifyCodeOnly(userId, 'DELETE_ACCOUNT', dto.otpCode);
    } else if (dto.password) {
      if (!user.password || !(await bcrypt.compare(dto.password, user.password))) {
        throw new UnauthorizedException('Modpas envalid');
      }
    } else {
      throw new BadRequestException('Modpas oswa kòd OTP obligatwa');
    }

    // Idanpotan : yon demand PENDING deja la — pa kreye yon dezyèm, retounen
    // eta aktyèl la (idempotan).
    const existing = await this.prisma.accountDeletionRequest.findFirst({
      where: { userId, status: 'PENDING' },
    });
    if (existing) return this.toStatusDto(existing);

    await this.assertNoBlockers(userId, user);

    const scheduledFor = new Date(Date.now() + ACCOUNT_DELETION_GRACE_HOURS * 60 * 60 * 1000);
    const request = await this.prisma.accountDeletionRequest.create({
      data: { userId, scheduledFor },
    });

    // Revoke TOUT sesyon mobil, menm sesyon kouran an — itilizatè a dwe
    // rekonekte pou anile (wè AuthService.login()).
    await this.authService.revokeAllSessions(userId, undefined, true);

    await this.mailService.sendAccountDeletionRequested(user.email, user.name || 'Kliyan', scheduledFor);

    return this.toStatusDto(request);
  }

  async cancelDeletion(userId: string) {
    const request = await this.prisma.accountDeletionRequest.findFirst({
      where: { userId, status: 'PENDING' },
    });
    if (!request) throw new NotFoundException('Pa gen demand sipresyon an kou pou kont sa a.');

    await this.prisma.accountDeletionRequest.update({
      where: { id: request.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    return { message: 'Demand sipresyon kont anile', status: 'CANCELLED' };
  }

  async getStatus(userId: string) {
    const request = await this.prisma.accountDeletionRequest.findFirst({
      where: { userId },
      orderBy: { requestedAt: 'desc' },
    });
    if (!request) return { status: 'NONE' };
    return this.toStatusDto(request);
  }

  // Lojik ki reyèlman egzekite — AUCUNE anonymizasyon, AUCUNE sipresyon
  // fizik. Sèlman flag login-bloke. Rele san gad pa
  // runScheduledExecutionCron() (automatik) AK pa wout admin manyèl la
  // (tès staging) — gad yo rete nan 2 moun ki rele l, pa isit la.
  async executeScheduledDeletions(): Promise<{ executed: number }> {
    const due = await this.prisma.accountDeletionRequest.findMany({
      where: { status: 'PENDING', scheduledFor: { lte: new Date() } },
    });

    let executed = 0;
    for (const request of due) {
      await this.prisma.$transaction([
        this.prisma.accountDeletionRequest.update({
          where: { id: request.id },
          data: { status: 'EXECUTED', executedAt: new Date() },
        }),
        this.prisma.user.update({
          where: { id: request.userId },
          data: { deletionExecutedAt: new Date() },
        }),
      ]);
      executed += 1;
    }

    return { executed };
  }

  // Automatik — koupe an staging (menm jan ak lòt cron yo), e koupe toupatou
  // si ACCOUNT_DELETION_EXECUTION_ENABLED != 'true' (defo false — dire
  // retansyon legal poko valide). Wout admin manyèl la (controller) bypass
  // DE GAD sa yo expreseman pou pèmèt tès an staging.
  @Cron('0 3 * * *')
  async runScheduledExecutionCron(): Promise<void> {
    if (isStaging()) {
      this.logger.log('[staging] runScheduledExecutionCron sote — koupe pou staging.');
      return;
    }
    if (process.env.ACCOUNT_DELETION_EXECUTION_ENABLED !== 'true') {
      this.logger.log(
        'ACCOUNT_DELETION_EXECUTION_ENABLED != "true" — egzekisyon sipresyon kont sote.',
      );
      return;
    }
    const { executed } = await this.executeScheduledDeletions();
    if (executed > 0) {
      this.logger.log(`${executed} demand sipresyon kont egzekite (login bloke, pa gen anonymizasyon).`);
    }
  }
}
