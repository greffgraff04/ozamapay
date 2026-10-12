import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MasterGuard } from '../admin/master.guard';
import { AccountDeletionService } from './account-deletion.service';

// Wout manyèl admin — menm patant ak /admin/sweep/run : bypass EKSPRESEMAN
// gad isStaging()/ACCOUNT_DELETION_EXECUTION_ENABLED pou pèmèt tès reyèl
// an staging, san depann de konfigirasyon pwodiksyon an. CEO sèlman.
@Controller('admin/account-deletion')
@UseGuards(JwtAuthGuard, MasterGuard)
export class AccountDeletionAdminController {
  constructor(private readonly accountDeletionService: AccountDeletionService) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  run() {
    return this.accountDeletionService.executeScheduledDeletions();
  }
}
