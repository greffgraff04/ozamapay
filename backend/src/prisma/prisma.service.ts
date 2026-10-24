import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// $connect() pa gen okenn timeout pa default — yon koneksyon DB ki pann
// (Neon ki reveye, rezo ki bloke san RST/refus) ka kenbe boot la ap tann
// pou tout tan, san okenn log, jiskaske Render touye deplwaman an apre
// ~15 min (port scan timeout) san okenn mesaj klè. 20s pou echwe vit avèk
// yon log ki klè olye de yon silans total.
const DB_CONNECT_TIMEOUT_MS = 20_000;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    let timedOut = false;
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => {
        timedOut = true;
        reject(new Error(`$connect() pa reponn apre ${DB_CONNECT_TIMEOUT_MS / 1000}s`));
      }, DB_CONNECT_TIMEOUT_MS);
    });

    try {
      await Promise.race([this.$connect(), timeout]);
    } catch (err) {
      this.logger.error(
        `FATAL: koneksyon DB echwe (${timedOut ? 'timeout' : 'erè'}) — ${
          err instanceof Error ? err.message : err
        }. Sèvè a ap fèmen pou Render ka restat li.`,
      );
      process.exit(1);
    }
  }
}