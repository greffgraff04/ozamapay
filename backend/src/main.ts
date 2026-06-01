import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';

async function bootstrap() {
  // Nou presize <NestExpressApplication> pou NestJS konnen n ap sèvi ak Express anba kod lan
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
  });

  // Konfigirasyon limit pou JSON ak URL-encoded atravè vèsyon Express ki anndan NestJS la
  const server = app.getHttpAdapter().getInstance();
  server.use(require('express').json({ limit: '5mb' }));
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

  app.use(helmet());

  app.enableCors({
    origin: [
      'http://localhost:3000',
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