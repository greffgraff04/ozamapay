import { Global, Module } from '@nestjs/common';
import { AlertCooldownService } from './alert-cooldown.service';

@Global() // menm apwòch ak PrismaModule — disponib pou tout lòt modil san yo pa bezwen enpòte l chak fwa
@Module({
  providers: [AlertCooldownService],
  exports: [AlertCooldownService],
})
export class AlertCooldownModule {}
