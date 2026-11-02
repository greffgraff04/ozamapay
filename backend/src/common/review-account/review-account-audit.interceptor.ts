import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { isReviewAccountEmail } from './review-account.config';
import { logReviewAccountActivity } from './review-account-audit';

// Global (APP_INTERCEPTOR, app.module.ts) — couvre les requêtes AUTORISÉES
// des 2 comptes démo (login terminé, convert, transfer-p2p entre eux,
// /users/lookup, etc). Les requêtes BLOQUÉES (retrait/dépôt/carte/KYC) sont
// déjà loggées par ReviewAccountBlockGuard lui-même, puisqu'un throw de
// guard empêche les interceptors de s'exécuter — les deux mécanismes
// ensemble couvrent "chaque requête" sans dépendre l'un de l'autre.
//
// Interceptors tournent après que les guards aient peuplé req.user, donc
// ça voit n'importe quelle route authentifiée, peu importe le contrôleur.
// Fire-and-forget : le log ne doit jamais retarder/faire échouer la vraie
// réponse (logReviewAccountActivity avale déjà ses propres erreurs).
@Injectable()
export class ReviewAccountAuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const email: string | undefined = req.user?.email;

    if (isReviewAccountEmail(email)) {
      void logReviewAccountActivity(this.prisma, {
        userId: req.user?.id ?? req.user?.sub ?? null,
        email: email!,
        method: req.method,
        path: req.originalUrl || req.url,
        ipAddress: ((req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim()) || req.ip,
      });
    }

    return next.handle();
  }
}
