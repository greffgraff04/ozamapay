import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  // ======================================================
  // RALE WALLET ITILIZATÈ A
  // ======================================================
  @Get()
  async getWallet(@Req() req: any) {
    return this.walletService.getWallet(req.user.id);
  }

  // ======================================================
  // 📈 NOUVO: RALE ESTATISTIK WALLET (Pou anpeche Erè 404 la)
  // ======================================================
  @Get('stats')
  async getWalletStats(@Req() req: any) {
    // Nou ka rele yon metòd nan walletService si w genyen l, 
    // oswa nou retounen yon estrikti stats pwòp pou fòse frontend lan louvri san pwoblèm:
    const wallet = await this.walletService.getWallet(req.user.id);
    const transactions = await this.walletService.getTransactions(req.user.id);

    // Kalkile antre ak soti rapid pou bay bèl vizyèl la
    const totalIncoming = transactions
      .filter((t: any) => t.status === 'COMPLETED' && t.receiverWalletId === wallet?.id)
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    const totalOutgoing = transactions
      .filter((t: any) => t.status === 'COMPLETED' && t.senderWalletId === wallet?.id)
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    return {
      success: true,
      balance: wallet ? Number(wallet.balance) : 0,
      currency: wallet ? wallet.currency : 'HTG',
      totalIncoming,
      totalOutgoing,
      transactionsCount: transactions.length,
    };
  }

  // ======================================================
  // RALE TRANZAKSYON YO
  // ======================================================
  @Get('transactions')
  async getTransactions(@Req() req: any) {
    return this.walletService.getTransactions(req.user.id);
  }

  // ======================================================
  // P2P TRANSFER (SEKIRIZE AK PIN)
  // ======================================================
  @Post('transfer-p2p')
  async transferP2P(
    @Req() req: any,
    @Body() body: { recipientEmail: string; amount: number; pin: string },
  ) {
    return this.walletService.transferP2P(
      req.user.id,
      body.recipientEmail,
      body.amount,
      body.pin,
    );
  }

  // ======================================================
  // TRANSFER KLASIK (SEKIRIZE AK PIN)
  // ======================================================
  @Post('transfer')
  async transfer(
    @Req() req: any,
    @Body() body: { recipientEmail: string; amount: number; pin: string },
  ) {
    return this.walletService.transfer(
      req.user.id,
      body.recipientEmail,
      body.amount,
      body.pin,
    );
  }

  // ======================================================
  // KREYE DEMANN TOPUP MANUEL (ak opsiyon upload resi)
  // ======================================================
  @Post('topup')
  @UseInterceptors(FileInterceptor('receipt', {
    storage: diskStorage({
      destination: './uploads/topup',
      filename: (_, file, cb) => {
        cb(null, `topup-${Date.now()}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  async createManualTopup(
    @Req() req: any,
    @Body() body: { amount: string; method: string; agentId?: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:10000';
    const proofImage = file ? `${backendUrl}/uploads/topup/${file.filename}` : undefined;
    return this.walletService.createManualTopup(
      req.user.id,
      Number(body.amount),
      body.method,
      body.agentId,
      proofImage,
    );
  }

  // ======================================================
  // KREYE DEMANN RETRÈ (MANUAL WITHDRAWAL)
  // ======================================================
  @Post('withdraw')
  async createWithdrawRequest(
    @Req() req: any,
    @Body() body: { amount: number; method: string; accountInfo: string },
  ) {
    return this.walletService.createWithdrawRequest(
      req.user.id,
      body.amount,
      body.method,
      body.accountInfo,
    );
  }

  // ======================================================
  // KREYE DEMANN FINANCE / SERVICE
  // ======================================================
  @Post('finance-request')
  @UseInterceptors(FileInterceptor('proofImage', {
    storage: diskStorage({
      destination: './uploads/finance',
      filename: (_, file, cb) => {
        cb(null, `finance-${Date.now()}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  async createFinanceRequest(
    @Req() req: any,
    @Body() body: { serviceType: any; amount: string; details: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:10000';
    const proofImage = file ? `${backendUrl}/uploads/finance/${file.filename}` : undefined;
    return this.walletService.createFinanceRequest(
      req.user.id,
      body.serviceType,
      Number(body.amount),
      body.details,
      proofImage,
    );
  }
}