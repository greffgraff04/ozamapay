import { Injectable, BadRequestException, InternalServerErrorException, HttpException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StrowalletService {
  private readonly baseUrl = 'https://strowallet.com/api/bitvcard';
  
  private readonly publicKey = 'pub_whaBCkzaSkiBDCkBRc81YmsWgNGZfnmMHFtaxbFu';
  private readonly secretKey = 'sec_DnkOJ9pucdDpz5mWKrEi5KJQ6BzI9fa0zvyWiKQE';

  constructor(private prisma: PrismaService) {}

  private getStroHeaders() {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  async createAndFundCard(userId: string, amountUsd: number) {
    const cleanAmountUsd = amountUsd ? Number(amountUsd) : 10;

    // 1️⃣ Jwenn pousantaj kat la nan DB
    const rateSettings = await this.prisma.rate.findUnique({ where: { key: 'CARD_RATE' } });
    if (!rateSettings) throw new InternalServerErrorException("Taux CARD_RATE pa konfigire.");

    const rateValue = rateSettings.value;
    const amountHtg = cleanAmountUsd * Number(rateValue);

    return await this.prisma.$transaction(async (tx) => {
      // 2️⃣ Jwenn itilizatè a ak tout relasyon reyèl li yo
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { wallet: true, kyc: true, virtualCard: true },
      });

      if (!user) throw new BadRequestException("Utilisateur introuvable.");
      
      // 🌟 KOREKSYON SEKIRITE KYC: Nou tcheke si estati a se APPROVED oubyen VERIFIED pou l pa janm bloke w
      // 🌟 KOREKSYON SEKIRITE KYC: Nou tcheke si estati a se APPROVED nan tab Kyc la
const isKycApproved = user.kyc && user.kyc.status === 'APPROVED';

if (!isKycApproved) {
  throw new BadRequestException("Le KYC de l'utilisateur doit être approuvé.");
}
      
      // Si w gen yon jaden kycStatus dirèkteman sou User a tou, nou ka tcheke l pou sekirite
      const isUserVerified = (user as any).kycStatus === 'APPROVED' || (user as any).kycStatus === 'VERIFIED';

      if (!isKycApproved && !isUserVerified) {
        throw new BadRequestException("Le KYC de l'utilisateur doit être approuvé ou vérifié.");
      }

      if (!user.wallet) throw new BadRequestException("Le portefeuille (wallet) de l'utilisateur n'existe pas.");
      
      // 🌟 KOREKSYON: Konvèti Decimal la an number pou konparizon an ka fèt
      const currentBalance = Number(user.wallet.balance);
      if (currentBalance < amountHtg) throw new BadRequestException("Solde insuffisant pour créer la carte.");

      // 🌟 KOREKSYON: Asire nou ke fullNameStr se yon string tout bon (pa null)
      const firstName = user.kyc?.firstName || 'Client';
      const lastName = user.kyc?.lastName || 'Ozama';
      const fullNameStr = `${firstName} ${lastName}`;
      const userEmail = user.email;

      // ==========================================
      // 1️⃣ KREYASYON KLIYAN SOU STROWALLET (REYÈL)
      // ==========================================
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
        idImage: "https://ozamapay.com/assets/mock-id.jpg", 
        userPhoto: "https://ozamapay.com/assets/mock-photo.jpg"
      };

      let customerId = '';
      let customerResponse: any;

      try {
        customerResponse = await axios.post(customerUrl, customerPayload, { headers: this.getStroHeaders() });
      } catch (apiError: any) {
        const msg = apiError.response?.data?.message || apiError.message || "Erè koneksyon ak StroWallet";
        throw new HttpException(`StroWallet User Error: ${msg}`, apiError.response?.status || 400);
      }

      if (customerResponse && customerResponse.data && customerResponse.data.success === true) {
        const resData = customerResponse.data;
        customerId = resData.response?.customerId || resData.customer_id || resData.customerId;
      } else {
        const errorMsg = customerResponse?.data?.message || "StroWallet refize kreyasyon kliyan an.";
        throw new BadRequestException(errorMsg);
      }

      if (!customerId) throw new BadRequestException("Impossible de récupérer le customer_id depuis StroWallet.");

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
          
          await tx.wallet.update({
            where: { id: user.wallet.id },
            data: { balance: { decrement: amountHtg } }
          });

          await tx.transaction.create({
            data: {
              reference: `OZM-CARD-${uuidv4().substring(0, 8).toUpperCase()}`,
              senderWalletId: user.wallet.id,
              amount: amountHtg,
              netAmount: amountHtg,
              type: 'PAYMENT',
              status: 'COMPLETED',
              title: 'Création Carte Virtuelle',
              description: `Achat carte Visa Virtuelle - $${cleanAmountUsd} USD`,
            },
          });

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
    const rateSettings = await this.prisma.rate.findUnique({ where: { key: 'CARD_RATE' } });
    if (!rateSettings) throw new InternalServerErrorException("Taux CARD_RATE pa konfigire.");

    const cleanAmountUsd = amountUsd ? Number(amountUsd) : 0;
    const amountHtg =
  cleanAmountUsd * Number(rateSettings.value);

    return await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, include: { wallet: true, virtualCard: true } });
      if (!user || !user.virtualCard || !user.wallet) throw new BadRequestException("Kat la oswa wallet pa egziste.");
      
      // 🌟 KOREKSYON: Konvèti Decimal an number isit la tou
      const currentBalance = Number(user.wallet.balance);
      if (currentBalance < amountHtg) throw new BadRequestException("Solde HTG insuffisant.");

      await tx.wallet.update({ where: { userId }, data: { balance: { decrement: amountHtg } } });

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