import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { isReviewAccountEmail, REVIEW_ACCOUNT_BLOCKED_MESSAGE } from './review-account.config';
import { logReviewAccountActivity } from './review-account-audit';

// Garde dédiée (en plus du gate KYC existant, pas à sa place) — appliquée
// par route sur retrait/dépôt réel/carte/finance-request/KYC submit.
// DOIT tourner après JwtAuthGuard dans le même @UseGuards([...]) pour que
// req.user soit déjà peuplé (même convention que KycApprovedGuard).
@Injectable()
export class ReviewAccountBlockGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const email: string | undefined = req.user?.email;

    if (!isReviewAccountEmail(email)) return true;

    await logReviewAccountActivity(this.prisma, {
      userId: req.user?.id ?? req.user?.sub ?? null,
      email: email!,
      method: req.method,
      path: req.originalUrl || req.url,
      ipAddress: ((req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim()) || req.ip,
    });

    throw new ForbiddenException(REVIEW_ACCOUNT_BLOCKED_MESSAGE);
  }
}
