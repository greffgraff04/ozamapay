import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const rawKey = req.headers['x-api-key'];
    if (!rawKey || typeof rawKey !== 'string') {
      throw new UnauthorizedException('Header X-API-Key manke');
    }

    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      include: { business: true },
    });

    if (!apiKey || !apiKey.isActive) {
      throw new UnauthorizedException('API Key envalid oswa revoke');
    }
    if (apiKey.business.status !== 'APPROVED') {
      throw new ForbiddenException('Biznis sa a pa apwouve pou itilize API a');
    }
    if (apiKey.business.tier !== 'PRO' && apiKey.business.tier !== 'ENTERPRISE') {
      throw new ForbiddenException('Aksè API disponib sèlman pou plan PRO ak ENTERPRISE');
    }

    // Fire-and-forget — don't block the request on a usage-tracking write.
    this.prisma.apiKey
      .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});

    req.apiKey = apiKey;
    req.business = apiKey.business;
    return true;
  }
}
