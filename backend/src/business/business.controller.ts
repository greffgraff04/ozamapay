import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  BusinessService,
  ApplyBusinessDto,
  WithdrawDto,
  InviteMemberDto,
} from './business.service';

@UseGuards(JwtAuthGuard)
@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  // POST /business/apply
  @Post('apply')
  apply(@Request() req, @Body() dto: ApplyBusinessDto) {
    return this.businessService.apply(
      req.user.id,
      req.user.email,
      req.user.name ?? null,
      dto,
    );
  }

  // GET /business/me
  @Get('me')
  getMyBusinesses(@Request() req) {
    return this.businessService.getMyBusinesses(req.user.id);
  }

  // GET /business/members/:memberId/preview
  @Get('members/:memberId/preview')
  getInvitationPreview(@Request() req, @Param('memberId') memberId: string) {
    return this.businessService.getInvitationPreview(req.user.id, memberId);
  }

  // POST /business/members/:memberId/accept
  // Note: this route must be declared before :id to avoid param collision
  @Post('members/:memberId/accept')
  acceptInvitation(@Request() req, @Param('memberId') memberId: string) {
    return this.businessService.acceptInvitation(req.user.id, memberId);
  }

  // GET /business/:id/wallet
  @Get(':id/wallet')
  getWallet(@Request() req, @Param('id') id: string) {
    return this.businessService.getWallet(req.user.id, id);
  }

  // GET /business/:id/transactions?page=1&limit=20
  @Get(':id/transactions')
  getTransactions(
    @Request() req,
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.businessService.getTransactions(req.user.id, id, page, limit);
  }

  // POST /business/:id/withdraw
  @Post(':id/withdraw')
  withdraw(@Request() req, @Param('id') id: string, @Body() dto: WithdrawDto) {
    return this.businessService.withdraw(req.user.id, id, dto);
  }

  // POST /business/:id/members/invite
  @Post(':id/members/invite')
  inviteMember(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.businessService.inviteMember(req.user.id, id, dto);
  }

  // GET /business/:id/members
  @Get(':id/members')
  getMembers(@Request() req, @Param('id') id: string) {
    return this.businessService.getMembers(req.user.id, id);
  }

  // DELETE /business/:id/members/:memberId
  @Delete(':id/members/:memberId')
  removeMember(
    @Request() req,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.businessService.removeMember(req.user.id, id, memberId);
  }

  // POST /business/:id/pay — authenticated payer
  @Post(':id/pay')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  payBusiness(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { amount: number; pin: string },
  ) {
    return this.businessService.payBusiness(req.user.id, id, body.amount, body.pin);
  }
}
