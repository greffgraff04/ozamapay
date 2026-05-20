import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Mete limit yo AVAN sèvè a kòmanse koute
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // 2. Debloke CORS ak konfigirasyon dinamik (Bypass Chrome CORS Block)
  app.enableCors({
    origin: (origin, callback) => {
      // Sa pèmèt nou aksepte localhost:3000, 127.0.0.1 oswa IP lokal la an menm tan san navigatè a pa bloke credentials
      callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // Pèmèt Next.js voye cookies/headers yo san lafimen
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // 3. SE SÈLMAN NAN DENYÈ LIY LAN NOU METE LISTEN
  const port = process.env.PORT || 3001;

await app.listen(port);
  console.log("OZAMA Sèvè pare sou port 3001 ak limit 50MB! ✅");
}

bootstrap();