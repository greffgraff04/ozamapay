import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HealthService } from './health/health.service';

async function bootstrap() {
  // Nou presize <NestExpressApplication> pou NestJS konnen n ap sèvi ak Express anba kod lan
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Fail fast if the DB schema is behind the Prisma migrations shipped in
  // this build — refuse to serve traffic against a stale schema instead of
  // starting up silently (this is what let the 2026-07-04 incident happen).
  try {
    await app.get(HealthService).assertMigrationsInSync();
  } catch (err) {
    console.error(
      `FATAL: sèvè a p ap demare — ${err instanceof Error ? err.message : err}`,
    );
    await app.close();
    process.exit(1);
  }

  // Konfigirasyon limit pou JSON ak URL-encoded. The verify callback captures req.rawBody
  // so @RawBody() works in the webhook controller. This middleware runs before NestJS's own
  // body parsers (registered during listen/init), so it must set req.rawBody here directly.
  const server = app.getHttpAdapter().getInstance();
  server.use(require('express').json({
    limit: '5mb',
    verify: (req: any, _res: any, buf: Buffer) => { req.rawBody = buf; },
  }));
  server.use(require('express').urlencoded({ limit: '5mb', extended: true }));

  // Intercept health check paths before NestJS/ThrottlerGuard to prevent 429s
  server.use((req: any, res: any, next: any) => {
    if (req.path === '/' || req.path === '/health' || req.path === '/health/detailed') {
      res.status(200).json({ status: 'ok' });
      return;
    }
    next();
  });

  // 3. Rann dosye uploads la piblik pou dashboard admin lan ka afiche foto KYC yo
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  app.useGlobalFilters(new AllExceptionsFilter());

  app.use(helmet());

  app.enableCors({
    origin: [
      'https://ozamapay.vercel.app',
      'https://ozamapay.com',
      'https://www.ozamapay.com',
      /\.vercel\.app$/,
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Render ap toujou voye process.env.PORT, si li pa jwenn li l ap pran 10000 kòm sekou
  const port = process.env.PORT || 10000;

  // Nou fòse koute sou '0.0.0.0' pou Render ka louvri pò a sou entènèt la
  await app.listen(port, '0.0.0.0');

  console.log(`OZAMA Sèvè pare sou port ${port} ak limit 5MB epi dosye static debloke! ✅`);
}

bootstrap();