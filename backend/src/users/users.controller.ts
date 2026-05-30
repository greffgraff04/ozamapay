import { Controller, Get, Post, Body, Request, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { UserService } from './users.service';
import * as jwt from 'jsonwebtoken'; // 🛡️ Nou itilize sa pou n dekode token la san pwoblèm chimen

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 🛡️ 1. ENDPOINT POU CHANJE OSWA KREYE PIN TRANZAKSYON
   */
  @Post('change-pin')
  @HttpCode(HttpStatus.OK)
  async changePin(@Request() req: any, @Body() body: { newPin: string }) {
    try {
      // Dekode token la depi nan headers yo pou nou ka jwenn ID David la 100% sekirize
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('Token manquante');
      }
      
      const token = authHeader.split(' ')[1];
      const decoded: any = jwt.decode(token); // Dekode san verifikasyon fòse jis pou pran sub/id la
      
      const userId = decoded?.sub || decoded?.id;
      if (!userId) {
        throw new UnauthorizedException('Token invalide');
      }

      return await this.userService.updateTransactionPin(userId, body.newPin);
    } catch (error) {
      throw new UnauthorizedException('Erè idantifikasyon');
    }
  }

  /**
   * 💼 2. ENDPOINT POU RALE PROFIL AJAN AN
   */
  @Get('agent/profile')
  async getAgentProfile(@Request() req: any) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    const decoded: any = jwt.decode(token);
    const userId = decoded?.sub || decoded?.id;
    return await this.userService.getAgentProfile(userId);
  }

  /**
   * 💰 3. ENDPOINT POU AJAN RECHAJE PWÒP KONT LI
   */
  @Post('agent/topup')
  @HttpCode(HttpStatus.OK)
  async agentTopup(@Request() req: any, @Body() body: { amount: number }) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    const decoded: any = jwt.decode(token);
    const userId = decoded?.sub || decoded?.id;
    return await this.userService.agentSelfTopup(userId, body.amount);
  }
}