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
  server.use(require('express').json({ limit: '50mb' }));
  server.use(require('express').urlencoded({ limit: '50mb', extended: true }));

  // 3. Rann dosye uploads la piblik pou dashboard admin lan ka afiche foto KYC yo
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  app.use(helmet());

  app.enableCors({
    origin: ['http://localhost:3000', 'https://ozamapay.vercel.app', /\.vercel\.app$/],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Render ap toujou voye process.env.PORT, si li pa jwenn li l ap pran 10000 kòm sekou
  const port = process.env.PORT || 10000;

  // Nou fòse koute sou '0.0.0.0' pou Render ka louvri pò a sou entènèt la
  await app.listen(port, '0.0.0.0');

  console.log(`OZAMA Sèvè pare sou port ${port} ak limit 50MB epi dosye static debloke! ✅`);
}

bootstrap();