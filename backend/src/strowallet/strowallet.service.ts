import { Injectable, BadRequestException, ForbiddenException, InternalServerErrorException, HttpException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StrowalletService {
  private readonly baseUrl = 'https://strowallet.com/api/bitvcard';
  private readonly publicKey = process.env.STROWALLET_PUBLIC_KEY!;
  private readonly secretKey = process.env.STROWALLET_SECRET_KEY!;

  constructor(private prisma: PrismaService) {}

  private getStroHeaders() {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  async createAndFundCard(userId: string, amountUsd: number) {
    const cleanAmountUsd = Number(amountUsd) || 3;
    if (cleanAmountUsd < 3) throw new BadRequestException('Montan minim se $3 USD');

    // 1️⃣ Jwenn pousantaj kat la nan DB
    const rateSettings = await this.prisma.rate.findUnique({ where: { key: 'CARD_RATE' } });
    if (!rateSettings) throw new InternalServerErrorException("Taux CARD_RATE pa konfigire.");

    const rateValue = Number(rateSettings.value);
    // User pays only for the initial deposit; OZAMAPAY absorbs the $2.50 creation fee
    const depositHtg = Math.round(cleanAmountUsd * rateValue * 100) / 100;
    const creationFeeHtg = Math.round(2.50 * rateValue * 100) / 100;

    return await this.prisma.$transaction(async (tx) => {
      // 2️⃣ Jwenn itilizatè a ak tout relasyon reyèl li yo
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { wallet: true, kyc: true, virtualCard: true },
      });

      if (!user) throw new BadRequestException("Utilisateur introuvable.");

      if (!user.kyc || user.kyc.status !== 'APPROVED') {
        throw new ForbiddenException('KYC dwe apwouve anvan ou ka kreye kat');
      }

      if (!user.wallet) throw new BadRequestException("Wallet ou pa egziste.");

      const currentBalance = Number(user.wallet.balance);
      if (currentBalance < depositHtg) throw new BadRequestException("Balans HTG ensifizan pou depo inisyal la.");

      // 🌟 KOREKSYON: Asire nou ke fullNameStr se yon string tout bon (pa null)
      const firstName = user.kyc?.firstName || 'Client';
      const lastName = user.kyc?.lastName || 'Ozama';
      const fullNameStr = `${firstName} ${lastName}`;
      const userEmail = user.email;

      // ==========================================
      // 1️⃣ KLIYAN STROWALLET — reuse si déjà kreye
      // ==========================================
      let customerId = user.strowalletCustomerId || '';

      if (!customerId) {
        const customerUrl = `${this.baseUrl}/create-user/`;
        const customerPayload = {
          public_key: this.publicKey,
          secret_key: this.secretKey,
          firstName: firstName,
          lastName: lastName,
          customerEmail: userEmail,
          phoneNumber: user.phone || '50933333333',
          dateOfBirth: user.kyc?.dateOfBirth || '2000-01-01',
          line1: user.kyc?.line1 || 'Port-au-Prince',
          houseNumber: "10",
          city: 'Port-au-Prince',
          state: 'Ouest',
          zipCode: '6110',
          country: 'HT',
          idType: "PASSPORT",
          idNumber: user.kyc?.idNumber || ("PASSPORT-" + Math.floor(100000 + Math.random() * 900000)),
          idImage: user.kyc?.idImage || 'https://ozamapay.com/assets/mock-id.jpg',
          userPhoto: user.kyc?.userPhoto || 'https://ozamapay.com/assets/mock-photo.jpg'
        };

        let customerResponse: any;
        try {
          customerResponse = await axios.post(customerUrl, customerPayload, { headers: this.getStroHeaders() });
        } catch (apiError: any) {
          const msg = apiError.response?.data?.message || apiError.message || "Erè koneksyon ak StroWallet";
          throw new HttpException(`StroWallet User Error: ${msg}`, apiError.response?.status || 400);
        }

        if (customerResponse?.data?.success === true) {
          const resData = customerResponse.data;
          customerId = resData.response?.customerId || resData.customer_id || resData.customerId;
        } else {
          const errorMsg = customerResponse?.data?.message || "StroWallet refize kreyasyon kliyan an.";
          throw new BadRequestException(errorMsg);
        }

        if (!customerId) throw new BadRequestException("Impossible de récupérer le customer_id depuis StroWallet.");

        // Persist so future card operations reuse this customer
        await tx.user.update({
          where: { id: userId },
          data: { strowalletCustomerId: customerId },
        });
      }

      // ==========================================
      // 2️⃣ KREYASYON KAT SOU STROWALLET (REYÈL)
      // ==========================================
      const cardUrl = `${this.baseUrl}/create-card/`;
      const cardPayload = {
        public_key: this.publicKey,
        secret_key: this.secretKey,
        customer_id: customerId, 
        customerEmail: userEmail, 
        amount: cleanAmountUsd.toString(), 
        card_name: fullNameStr,
        card_type: "virtual"
      };

      try {
        const cardResponse = await axios.post(cardUrl, cardPayload, { headers: this.getStroHeaders() });
        const stroData = cardResponse.data;

        if (stroData && stroData.success === true) {

          // Debit user wallet for the initial deposit only
          await tx.wallet.update({
            where: { id: user.wallet.id },
            data: { balance: { decrement: depositHtg } },
          });

          await tx.transaction.create({
            data: {
              reference: `OZM-CARD-${uuidv4().substring(0, 8).toUpperCase()}`,
              senderWalletId: user.wallet.id,
              amount: depositHtg,
              netAmount: depositHtg,
              fee: 0,
              type: 'PAYMENT',
              status: 'COMPLETED',
              title: 'Depo Inisyal Kat VISA',
              description: `Depo $${cleanAmountUsd} USD sou kat vityèl OZAMAPAY`,
            },
          });

          // OZAMAPAY absorbs the $2.50 Strowallet creation fee from master wallet
          const masterWallet = await tx.wallet.findFirst({
            where: { userId: process.env.OZAMAPAY_MASTER_ID },
          });
          if (masterWallet) {
            await tx.wallet.update({
              where: { id: masterWallet.id },
              data: { balance: { decrement: creationFeeHtg } },
            });
            await tx.transaction.create({
              data: {
                reference: `OZM-CARDFEE-${uuidv4().substring(0, 8).toUpperCase()}`,
                senderWalletId: masterWallet.id,
                amount: creationFeeHtg,
                netAmount: creationFeeHtg,
                fee: 0,
                type: 'PAYMENT',
                status: 'COMPLETED',
                title: 'Frè Kreye Kat VISA',
                description: `OZAMAPAY absòbe frè kreye kat pou ${user.email}`,
              },
            });
          }

          return await tx.virtualCard.create({
            data: {
              userId: user.id,
              cardId: stroData.card_id || stroData.response?.card_id,
              cardName: fullNameStr, 
              last4: stroData.card_number ? stroData.card_number.slice(-4) : '4242',
              expiry: stroData.expiry || '12/29',
              brand: 'VISA',
              balance: cleanAmountUsd,
              status: 'ACTIVE',
            },
          });
        } else {
          const errorMsg = stroData?.message || "StroWallet refize kreyasyon kat la.";
          throw new BadRequestException(errorMsg);
        }
      } catch (apiError: any) {
        const msg = apiError.response?.data?.message || apiError.message;
        throw new HttpException(`StroWallet Card Error: ${msg}`, apiError.response?.status || 400);
      }
    });
  }

  async getCardSecretDetails(userId: string) {
    const card = await this.prisma.virtualCard.findUnique({ where: { userId } });
    if (!card) throw new BadRequestException("Kat la pa egziste.");

    const url = `${this.baseUrl}/fetch-card-detail/`;
    const payload = { public_key: this.publicKey, secret_key: this.secretKey, card_id: card.cardId };

    try {
      const response = await axios.post(url, payload, { headers: this.getStroHeaders() });
      if (response.data && response.data.success === true) return response.data;
      throw new BadRequestException("Impossible de récupérer les détails de la carte depuis l'API.");
    } catch (error: any) {
      throw new BadRequestException(error.message || "Erè koneksyon ak StroWallet");
    }
  }

  async fundVirtualCard(userId: string, amountUsd: number) {
    const cleanAmountUsd = Number(amountUsd) || 0;
    if (cleanAmountUsd < 3) throw new BadRequestException('Montan minim rechajman se $3 USD');

    const rateSettings = await this.prisma.rate.findUnique({ where: { key: 'CARD_RATE' } });
    if (!rateSettings) throw new InternalServerErrorException("Taux CARD_RATE pa konfigire.");

    const rateValue = Number(rateSettings.value);
    // Strowallet recharge fee: $1.90 flat + 1.9% of amount
    const feeUsd = Math.round((1.90 + cleanAmountUsd * 0.019) * 100) / 100;
    const totalUsd = cleanAmountUsd + feeUsd;
    const totalHtg = Math.round(totalUsd * rateValue * 100) / 100;

    return await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, include: { wallet: true, virtualCard: true } });
      if (!user || !user.virtualCard || !user.wallet) throw new BadRequestException("Kat la oswa wallet pa egziste.");

      const currentBalance = Number(user.wallet.balance);
      if (currentBalance < totalHtg) throw new BadRequestException(`Balans ensifizan. Ou bezwen ${totalHtg.toFixed(0)} HTG.`);

      // Send only the requested amount to Strowallet (fee is our cost coverage)
      const stroRes = await axios.post(
        `${this.baseUrl}/fund-card/`,
        {
          public_key: this.publicKey,
          secret_key: this.secretKey,
          card_id: user.virtualCard.cardId,
          amount: cleanAmountUsd.toString(),
        },
        { headers: this.getStroHeaders() },
      );
      const stroData = stroRes.data;
      if (!stroData || stroData.success !== true) {
        throw new BadRequestException('Rechajman kat echwe: ' + (stroData?.message || 'Erè enkoni'));
      }

      await tx.wallet.update({ where: { userId }, data: { balance: { decrement: totalHtg } } });

      await tx.transaction.create({
        data: {
          reference: `OZM-FUND-${uuidv4().substring(0, 8).toUpperCase()}`,
          senderWalletId: user.wallet.id,
          amount: totalHtg,
          netAmount: totalHtg,
          fee: Math.round(feeUsd * rateValue * 100) / 100,
          type: 'PAYMENT',
          status: 'COMPLETED',
          title: 'Rechajman Kat VISA',
          description: `Rechaje $${cleanAmountUsd} USD + frè $${feeUsd} USD`,
        },
      });

      return await tx.virtualCard.update({
        where: { userId },
        data: { balance: { increment: cleanAmountUsd } },
      });
    });
  }

  async getCardHistory(userId: string) {
    return [];
  }

  async getMyCardLocalData(userId: string) {
    return await this.prisma.virtualCard.findUnique({ where: { userId } });
  }
}