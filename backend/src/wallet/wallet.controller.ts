import {
  Controller,
  Get,
  Post,
  Body,
  Query,
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
import { TransferDto } from './dto/transfer.dto';
import { ManualTopupDto } from './dto/manual-topup.dto';
import { WithdrawRequestDto } from './dto/withdraw-request.dto';
import { FinanceRequestDto } from './dto/finance-request.dto';
import { ConvertQuoteDto, ConvertExecuteDto } from './dto/convert.dto';

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
    const { data: transactions, total } = await this.walletService.getTransactions(req.user.id, 50, 0);

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
      transactionsCount: total,
    };
  }

  // ======================================================
  // RALE TRANZAKSYON YO
  // ======================================================
  // Poll dashboard la (chak 25s) rele wout sa a souvan — lekti sèlman, san
  // risk finansye, donk limit pi laj pase default (100/60s) la.
  @Get('transactions')
  @Throttle({ short: { limit: 300, ttl: 60000 } })
  async getTransactions(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('type') type?: string,
  ) {
    const parsedLimit = Math.min(Number(limit) || 5, 50);
    const parsedOffset = Math.max(Number(offset) || 0, 0);
    return this.walletService.getTransactions(req.user.id, parsedLimit, parsedOffset, type || undefined);
  }

  // ======================================================
  // P2P TRANSFER (SEKIRIZE AK PIN)
  // ======================================================
  @Post('transfer-p2p')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async transferP2P(
    @Req() req: any,
    @Body() body: TransferDto,
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
    @Body() body: TransferDto,
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
    @Body() body: ManualTopupDto,
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
    @Body() body: WithdrawRequestDto,
  ) {
    // Nòmalizasyon defansiv: ValidationModePipe sèlman aplike @Transform nan
    // DTO a an mod "enforce" — an mod "log" (default jodi a) li retounen
    // valè brit la san chanje l. Nòmalize isit la garanti sèvis la toujou
    // resevwa yon valè an MAJISKIL, kèlkeswa VALIDATION_MODE.
    const method = typeof body.method === 'string' ? body.method.toUpperCase() : body.method;
    return this.walletService.createWithdrawRequest(
      req.user.id,
      body.amount,
      method,
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
    @Body() body: FinanceRequestDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const proofImage = file
      ? await this.imagekitService.uploadFile(file, 'finance')
      : undefined;
    // Menm rezon ak /wallet/withdraw pi wo a — nòmalize defansivman paske
    // @Transform nan DTO a pa aplike an mod "log" (default jodi a).
    const serviceType =
      typeof body.serviceType === 'string' ? body.serviceType.toUpperCase() : body.serviceType;
    return this.walletService.createFinanceRequest(
      req.user.id,
      serviceType,
      Number(body.amount),
      body.details,
      proofImage,
    );
  }

  // ======================================================
  // L7 — DEVIS KONVÈSYON DEVISE (valab 30s, quoteId pou egzekite)
  // ======================================================
  @Get('convert/quote')
  @Throttle({ short: { limit: 20, ttl: 60000 } })
  async getConversionQuote(
    @Req() req: any,
    @Query() query: ConvertQuoteDto,
  ) {
    return this.walletService.getConversionQuote(
      req.user.id,
      query.from,
      query.to,
      query.amount,
    );
  }

  // ======================================================
  // L7 — EGZEKITE KONVÈSYON DEVISE (sèlman ak yon quoteId valab)
  // ======================================================
  @Post('convert')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  async executeConversion(
    @Req() req: any,
    @Body() body: ConvertExecuteDto,
  ) {
    return this.walletService.executeConversion(req.user.id, body.quoteId);
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
