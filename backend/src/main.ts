import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express'; // 1. Ajoute sa pou sipòte static assets
import { join } from 'path'; // 2. Ajoute sa pou jere chemen dosye yo

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

  // Debloke CORS nèt (Bypass Chrome CORS Block) pou Next.js ak aplikasyon mobil lan
  app.enableCors({
    origin: (origin, callback) => {
      // Sa pèmèt nou aksepte nenpòt orijin (localhost, vercel, render) san navigatè a pa bloke credentials
      callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // Pèmèt Next.js voye cookies/headers yo san lafimen
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // Render ap toujou voye process.env.PORT, si li pa jwenn li l ap pran 10000 kòm sekou
  const port = process.env.PORT || 10000;

  // Nou fòse koute sou '0.0.0.0' pou Render ka louvri pò a sou entènèt la
  await app.listen(port, '0.0.0.0');

  console.log(`OZAMA Sèvè pare sou port ${port} ak limit 50MB epi dosye static debloke! ✅`);
}

bootstrap();