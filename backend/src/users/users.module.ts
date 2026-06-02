import { Module } from '@nestjs/common';
import { UserController } from './users.controller';
import { UserService } from './users.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ImageKitModule } from '../imagekit/imagekit.module';

@Module({
  imports: [PrismaModule, ImageKitModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UsersModule {} // ← ASIRE W SE "UsersModule" KI EKRI LA AK YON "s"
