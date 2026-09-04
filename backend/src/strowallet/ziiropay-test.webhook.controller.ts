import { Controller, Post, Body, HttpCode, HttpStatus, Logger, Req, UnauthorizedException } from '@nestjs/common';

// Andpwen TANPORÈ SÈLMAN pou konfime ziiropay.com ka reyèlman voye yon
// webhook rive kote nou — sekrè SEPARE nèt de STROWALLET_WEBHOOK_SECRET
// (v1/webhooks/strowallet), pa touche webhook pwodiksyon an menm jan.
// Retire andpwen sa a yon fwa tès la fini.
@Controller('v1/webhooks/ziiropay-test')
export class ZiiropayTestWebhookController {
  private readonly logger = new Logger(ZiiropayTestWebhookController.name);

  @Post()
  @HttpCode(HttpStatus.OK)
  handleTestWebhook(@Body() payload: any, @Req() req: any) {
    const secret = req.query.secret;
    if (!secret || secret !== process.env.ZIIROPAY_TEST_WEBHOOK_SECRET) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    // request.path (pa request.url) — evite dump ?secret= nan lòg (menm
    // règ ak StrowalletWebhookController/AllExceptionsFilter).
    this.logger.log(`[ZiiropayTest] rive sou ${req.path} | payload=${JSON.stringify(payload)}`);

    return { received: true };
  }
}
