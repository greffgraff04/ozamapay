import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Si w mete @Global(), tout modil ap wè l otomatikman
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Sa a trè enpòtan!
})
export class PrismaModule {}