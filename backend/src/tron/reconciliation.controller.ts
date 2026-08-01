import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CooGuard } from '../admin/coo.guard';
import { ReconciliationService } from './reconciliation.service';

@Controller('admin/reconciliation')
@UseGuards(JwtAuthGuard, CooGuard)
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  // Read-only — never mutates Wallet, CryptoDeposit, or SweepTransaction.
  @Get('run')
  async run() {
    return this.reconciliationService.runReconciliation();
  }
}
