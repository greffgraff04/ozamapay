import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Menm estrateji 'jwt' ak JwtAuthGuard, men pa janm rejte requête a — req.user
// senpleman rete undefined si pa gen token valid. Itilize pou wout piblik
// (egz. GET /pricing) ki ka pèsonalize pou yon itilizatè konekte san egzije l.
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(_err: any, user: any): TUser {
    return user as TUser;
  }

  canActivate(context: ExecutionContext) {
    try {
      return super.canActivate(context) as boolean;
    } catch {
      return true;
    }
  }
}
