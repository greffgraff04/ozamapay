import { Controller, Post, Body, Req } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { TrackingService } from './tracking.service';

interface PingDto {
  sessionId: string;
  page: string;
  status: 'BROWSING' | 'SIGNING_UP' | 'LOGGING_IN' | 'AUTHENTICATED';
}

@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post('ping')
  @SkipThrottle()
  ping(@Body() body: PingDto, @Req() req: any) {
    const rawIp: string =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      '';

    const geo = this.trackingService.resolveGeo(rawIp);

    const userInfo = this.trackingService.tryDecodeJwt(
      req.headers['authorization'] as string | undefined,
    );

    this.trackingService.upsertVisitor({
      sessionId: body.sessionId,
      ip: rawIp,
      page: body.page,
      status: body.status,
      ...geo,
      ...(userInfo ?? {}),
    });

    return { success: true };
  }
}
