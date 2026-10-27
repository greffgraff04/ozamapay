import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserService } from './users.service';
import { UserLookupThrottlerGuard } from './user-lookup-throttler.guard';

// Scanner QR app mobil (plan endpoints-app) — chemen SEPARE de UserController
// (@Controller('user')) paske wout sa a espesifikman "/users/lookup" (pliryèl)
// e li gen pwòp limit débit pa itilizatè, pa jwenn menm chemen ak lòt wout
// /user/* yo.
@Controller('users')
@UseGuards(JwtAuthGuard, UserLookupThrottlerGuard)
export class UsersLookupController {
  constructor(private readonly userService: UserService) {}

  // 20/min pa itilizatè (tracker nan UserLookupThrottlerGuard) — anpeche yon
  // moun "deviner" imel kliyan an mas. Garde Guard ThrottlerGuard global la
  // (APP_GUARD, pa IP) aktif tou an paralèl, san chanje konpòtman lòt wout.
  @Get('lookup')
  @Throttle({ short: { limit: 20, ttl: 60000 } })
  lookup(@Query('email') email?: string) {
    return this.userService.lookupByEmail(email);
  }
}
