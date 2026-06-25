import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as geoip from 'geoip-lite';

export interface VisitorRecord {
  sessionId: string;
  ip: string;
  country?: string;
  city?: string;
  lat?: number;
  lon?: number;
  page: string;
  status: 'BROWSING' | 'SIGNING_UP' | 'LOGGING_IN' | 'AUTHENTICATED';
  userId?: string;
  userLabel?: string;
  lastSeenAt: number;
}

export interface RecentTransfer {
  reference: string;
  amount: number;
  senderLabel: string;
  receiverLabel: string;
  createdAt: number;
}

@Injectable()
export class TrackingService implements OnModuleInit, OnModuleDestroy {
  private readonly visitors = new Map<string, VisitorRecord>();
  private readonly recentTransfers: RecentTransfer[] = [];
  private cleanupTimer: NodeJS.Timeout;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.cleanupTimer = setInterval(() => this.sweepExpiredVisitors(), 10_000);
  }

  onModuleDestroy() {
    clearInterval(this.cleanupTimer);
  }

  private sweepExpiredVisitors() {
    const cutoff = Date.now() - 30_000;
    for (const [id, record] of this.visitors) {
      if (record.lastSeenAt < cutoff) this.visitors.delete(id);
    }
  }

  maskName(name: string | null | undefined): string {
    if (!name?.trim()) return 'Itilizatè';
    const parts = name.trim().split(/\s+/);
    const lastInitial = parts[1] ? `${parts[1][0].toUpperCase()}.` : '';
    return lastInitial ? `${parts[0]} ${lastInitial}` : parts[0];
  }

  private shortHash(id: string): string {
    let h = 0;
    for (const c of id) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
    return Math.abs(h).toString().slice(0, 4).padStart(4, '0');
  }

  resolveGeo(ip: string): Partial<Pick<VisitorRecord, 'country' | 'city' | 'lat' | 'lon'>> {
    try {
      const geo = geoip.lookup(ip);
      if (!geo) return {};
      return { country: geo.country, city: geo.city, lat: geo.ll[0], lon: geo.ll[1] };
    } catch {
      return {};
    }
  }

  tryDecodeJwt(authHeader: string | undefined): { userId: string; userLabel: string } | null {
    if (!authHeader?.startsWith('Bearer ')) return null;
    try {
      const payload = this.jwtService.verify<{ sub: string; name?: string }>(authHeader.slice(7));
      const userLabel = payload.name
        ? this.maskName(payload.name)
        : `Itilizatè #${this.shortHash(payload.sub)}`;
      return { userId: payload.sub, userLabel };
    } catch {
      return null;
    }
  }

  upsertVisitor(record: Omit<VisitorRecord, 'lastSeenAt'>) {
    this.visitors.set(record.sessionId, { ...record, lastSeenAt: Date.now() });
  }

  getVisitors(): VisitorRecord[] {
    return Array.from(this.visitors.values());
  }

  pushRecentTransfer(transfer: RecentTransfer) {
    this.recentTransfers.unshift(transfer);
    if (this.recentTransfers.length > 20) this.recentTransfers.pop();
  }

  async getLiveActivity() {
    const dbTransfers = await this.prisma.transaction.findMany({
      where: { type: 'TRANSFER' },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: {
        senderWallet: { include: { user: true } },
        receiverWallet: { include: { user: true } },
      },
    });

    const dbMapped: RecentTransfer[] = dbTransfers.map((t) => ({
      reference: t.reference,
      amount: Number(t.amount),
      senderLabel: this.maskName(t.senderWallet?.user?.name),
      receiverLabel: this.maskName(t.receiverWallet?.user?.name),
      createdAt: t.createdAt.getTime(),
    }));

    const seen = new Set(dbMapped.map((t) => t.reference));
    const merged = [
      ...this.recentTransfers.filter((t) => !seen.has(t.reference)),
      ...dbMapped,
    ];
    merged.sort((a, b) => b.createdAt - a.createdAt);

    return {
      visitors: this.getVisitors(),
      recentTransactions: merged.slice(0, 15),
    };
  }
}
