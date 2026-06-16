import { Global, Module } from '@nestjs/common';
import { ReloadlyAuthService } from './reloadly-auth.service';

@Global()
@Module({
  providers: [ReloadlyAuthService],
  exports: [ReloadlyAuthService],
})
export class ReloadlyAuthModule {}
