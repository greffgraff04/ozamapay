import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // 1. Nou pase limit 50mb yo dirèkteman nan kreyasyon aplikasyon an pou evite konfli body-parser
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
  });

  // Konfigirasyon limit pou JSON ak URL-encoded atravè vèsyon Express ki anndan NestJS la
  const server = app.getHttpAdapter().getInstance();
  server.use(require('express').json({ limit: '50mb' }));
  server.use(require('express').urlencoded({ limit: '50mb', extended: true }));

  // 2. Debloke CORS nèt (Bypass Chrome CORS Block) pou Next.js ak aplikasyon mobil lan
  app.enableCors({
    origin: (origin, callback) => {
      // Sa pèmèt nou aksepte nenpòt orijin (localhost, vercel, render) san navigatè a pa bloke credentials
      callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // Pèmèt Next.js voye cookies/headers yo san lafimen
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // 3. Render ap toujou voye process.env.PORT, si li pa jwenn li l ap pran 10000 kòm sekou
  const port = process.env.PORT || 10000;

  // Nou fòse koute sou '0.0.0.0' pou Render ka louvri pò a sou entènèt la
  await app.listen(port, '0.0.0.0');

  console.log(`OZAMA Sèvè pare sou port ${port} ak limit 50MB! ✅`);
}

bootstrap();