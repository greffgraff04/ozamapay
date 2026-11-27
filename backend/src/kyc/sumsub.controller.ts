import {
  Controller,
  Post,
  Request,
  Headers,
  RawBody,
  HttpCode,
  UseGuards,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SumsubService } from './sumsub.service';

// Controller SÉPARÉ de KycController exprès : KycController porte
// @UseGuards(JwtAuthGuard) au niveau classe, or le webhook doit rester public.
// Même préfixe de route 'kyc' → /kyc/sumsub/link et /kyc/sumsub/webhook.
// Les DEUX endpoints sont derrière SUMSUB_ENABLED (404 si désactivé).
@Controller('kyc')
export class SumsubController {
  private readonly logger = new Logger('SumsubController');

  constructor(private readonly sumsub: SumsubService) {}

  // Authentifié : génère un lien Web SDK pour l'utilisateur connecté (lang=fr).
  // N'écrit rien en base.
  @Post('sumsub/link')
  @UseGuards(JwtAuthGuard)
  async createLink(@Request() req: any): Promise<{ url: string }> {
    if (!this.sumsub.enabled) {
      throw new NotFoundException();
    }
    const url = await this.sumsub.generateWebSdkLink(req.user.id, 'fr');
    return { url };
  }

  // Public : webhook Sumsub. Vérifie la signature (x-payload-digest), journalise
  // l'événement, répond 200. NE MODIFIE AUCUN statut KYC pour l'instant —
  // le branchement en base se fera après validation.
  @Post('sumsub/webhook')
  @HttpCode(200)
  async webhook(
    @RawBody() rawBody: Buffer,
    @Headers('x-payload-digest') digest?: string,
  ): Promise<{ ok: true }> {
    if (!this.sumsub.enabled) {
      throw new NotFoundException();
    }

    if (!rawBody || !this.sumsub.verifyWebhook(rawBody, digest)) {
      this.logger.warn('Sumsub webhook: signature invalide ou absente — rejeté');
      throw new UnauthorizedException('Signature webhook invalide');
    }

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody.toString('utf8') || '{}');
    } catch {
      payload = {};
    }

    this.logger.log(
      `Sumsub webhook reçu — type=${payload.type ?? '?'} ` +
        `applicantId=${payload.applicantId ?? '?'} ` +
        `reviewAnswer=${payload.reviewResult?.reviewAnswer ?? '?'}`,
    );

    // On ne traite QUE les événements de revue finale. Tout autre type est
    // acquitté (200) sans aucune écriture.
    if (payload.type === 'applicantReviewed') {
      const outcome = await this.sumsub.processApplicantReviewed(payload);
      this.logger.log(`Sumsub applicantReviewed traité — résultat=${outcome}`);
    } else {
      this.logger.log(`Sumsub webhook: type ignoré (${payload.type ?? '?'})`);
    }

    return { ok: true };
  }
}
