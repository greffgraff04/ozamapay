// src/auth/jwt-auth.guard.ts

import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger('JwtAuthGuard');

  // @nestjs/passport's default handleRequest throws a bare UnauthorizedException
  // (message "Unauthorized", no detail) on any failure, and 401s aren't logged
  // anywhere else app-wide (see AllExceptionsFilter) — so a rejected request
  // currently leaves zero trace. This adds one targeted warn log, same pattern
  // already used for the StroWallet webhook 401s, to capture *why* on the next
  // occurrence (passport-jwt's `info` carries the real reason: "jwt expired",
  // "jwt malformed", "invalid signature", "No auth token", etc.).
  //
  // Only logs when an Authorization header was actually present — an absent
  // header is routine (any anonymous/unauthenticated request hitting a
  // protected route) and would just be noise; a *sent but rejected* token is
  // the specific, actionable case.
  handleRequest<TUser = any>(err: any, user: any, info: any, context: ExecutionContext, status?: any): TUser {
    if (err || !user) {
      const req = context.switchToHttp().getRequest();
      if (req.headers?.authorization) {
        this.logger.warn(
          `401 with token present — ${req.method} ${req.path}: ${info?.message || info?.name || err?.message || 'unknown reason'}`,
        );
      }
    }
    return super.handleRequest(err, user, info, context, status);
  }
}