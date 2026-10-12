import { Module } from '@nestjs/common';
import { AppStatusController } from './app-status.controller';
import { AppStatusService } from './app-status.service';

@Module({
  controllers: [AppStatusController],
  providers: [AppStatusService],
})
export class AppStatusModule {}
