import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AppStatusService } from './app-status.service';

// Piblik — pa gen JwtAuthGuard. Rele depi SplashScreen/ForceUpdateScreen/
// MaintenanceScreen anvan menm itilizatè a konekte (plan endpoints-app, lo
// L5). Aucun secret, aucune info interne, aucun nom de fournisseur isit la.
@Controller('app')
export class AppStatusController {
  constructor(private readonly appStatusService: AppStatusService) {}

  @Get('status')
  @Throttle({ short: { limit: 20, ttl: 60000 } })
  getStatus() {
    return this.appStatusService.getStatus();
  }
}
