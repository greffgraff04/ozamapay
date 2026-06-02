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
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ImageKitService } from '../imagekit/imagekit.service';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly imagekitService: ImageKitService,
  ) {}

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
    const wallet = await this.walletService.getWallet(req.user.id);
    const transactions = await this.walletService.getTransactions(req.user.id);

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
  @Throttle({ short: { limit: 5, ttl: 60000 } })
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
  @Throttle({ short: { limit: 5, ttl: 60000 } })
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
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  async createManualTopup(
    @Req() req: any,
    @Body() body: { amount: string; method: string; agentId?: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const proofImage = file
      ? await this.imagekitService.uploadFile(file, 'topup')
      : undefined;
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
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  async createFinanceRequest(
    @Req() req: any,
    @Body() body: { serviceType: any; amount: string; details: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const proofImage = file
      ? await this.imagekitService.uploadFile(file, 'finance')
      : undefined;
    return this.walletService.createFinanceRequest(
      req.user.id,
      body.serviceType,
      Number(body.amount),
      body.details,
      proofImage,
    );
  }

  @Get('notifications')
  async getNotifications(@Req() req: any) {
    return this.walletService.getNotifications(req.user.id);
  }

  @Post('notifications/read-all')
  async markAllRead(@Req() req: any) {
    return this.walletService.markNotificationsRead(req.user.id);
  }
}
