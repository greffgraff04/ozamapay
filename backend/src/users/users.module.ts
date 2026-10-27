import { Module } from '@nestjs/common';
import { UserController } from './users.controller';
import { UsersLookupController } from './users-lookup.controller';
import { UserService } from './users.service';
import { UserLookupThrottlerGuard } from './user-lookup-throttler.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { ImageKitModule } from '../imagekit/imagekit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, ImageKitModule, AuthModule],
  controllers: [UserController, UsersLookupController],
  providers: [UserService, UserLookupThrottlerGuard],
  exports: [UserService],
})
export class UsersModule {} // ← ASIRE W SE "UsersModule" KI EKRI LA AK YON "s"
