import { Injectable } from '@nestjs/common';
// Nou itilize require paske modil la pa gen tip TypeScript ofisyèl
// @ts-ignore
const moncash = require('moncash-sdk');

@Injectable()
export class PaymentsService {
  constructor() {
    // Konfigirasyon SDK a ak kle ki nan .env ou
    // Ref: Capture d’écran 2026-05-14 à 14.41.37.jpg
    moncash.configure({
      mode: process.env.MONCASH_MODE || 'sandbox', 
      client_id: process.env.MONCASH_CLIENT_ID,
      client_secret: process.env.MONCASH_SECRET_KEY,
    });
  }

  async createMonCashPayment(amount: number, userId: string): Promise<string> {
    const payment_creator = moncash.payment;
    
    // Nou kreye yon OrderId inik pou OZAMA PAY
    const orderId = `OZAMA-${Date.now()}`;

    const create_payment_json = {
      amount: amount,
      orderId: orderId,
    };

    return new Promise((resolve, reject) => {
      // Nou rele metòd create a jan sa parèt nan Capture d’écran 2026-05-14 à 14.41.37.jpg
      payment_creator.create(create_payment_json, (error: any, payment: any) => {
        if (error) {
          console.error('Erè MonCash SDK:', error);
          reject(error);
        } else {
          // Nou rekipere link redirect la pou voye kliyan an al peye
          // Ref: Capture d’écran 2026-05-14 à 14.41.40.jpg
          const redirectUri = payment_creator.redirect_uri(payment);
          resolve(redirectUri);
        }
      });
    });
  }

  // NOU METE L ANNDAN CLASS LA KOUNYE A
  async validateMonCashPayment(transactionId: string) {
    return new Promise((resolve, reject) => {
      const capture = moncash.capture;
      // Nou itilize metòd getByTransactionId a jan sa parèt nan Capture d’écran 2026-05-14 à 14.41.40.jpg
      capture.getByTransactionId(transactionId, async (error, payment) => {
        if (error) {
          console.error('Erè validation:', error);
          return reject(error);
        }
        
        // Isit la, ou tcheke si peman an "successful" toutbon
        const status = payment.payment.status;
        const amount = payment.payment.cost;
        const orderId = payment.payment.order_id; // ID ou te voye nan topup la

        if (status === 'successful') {
          // Isit la ou ka ajoute lojik Prisma ou pou mete kòb la nan bous la
          console.log(`✅ Peman valide pou ${amount} HTG!`);
          resolve(payment);
        } else {
          resolve(null);
        }
      });
    });
  }
} // <--- Sa se dènye akolad ki fèmen class la