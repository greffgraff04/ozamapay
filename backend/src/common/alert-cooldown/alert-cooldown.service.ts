import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Antan tout alèt operasyonèl yo (to estal, echèk kat, drift balans, sante
// Tron...) te voye san limit — chak sik cron ki jwenn menm pwoblèm nan
// repete a te re-voye menm imèl la, ki te fè imèl "URGENCE" reprezante 45%
// nan tout volim Brevo (odit 10 sept 2026). 3 èdtan chwazi kòm mwayèn nan
// entèval 2-3h yo mande.
export const ALERT_COOLDOWN_MS = 3 * 60 * 60 * 1000;

@Injectable()
export class AlertCooldownService {
  constructor(private prisma: PrismaService) {}

  // Retounen true SÈLMAN si cooldown lan fin pase (oswa se premye fwa pou
  // `key` sa a) — epi MAKE l imedyatman pou anpeche 2 apèl paralèl pase an
  // menm tan pandan menm sik la. `key` se yon idantifyan lib chwazi pa sit
  // apèl la (egzanp "rate-stale:USD_HTG", "card-creation-failure:<userId>").
  async shouldSend(key: string, cooldownMs: number = ALERT_COOLDOWN_MS): Promise<boolean> {
    const now = new Date();
    const existing = await this.prisma.alertCooldown.findUnique({ where: { key } });
    if (existing && now.getTime() - existing.lastSentAt.getTime() < cooldownMs) {
      return false;
    }
    await this.prisma.alertCooldown.upsert({
      where: { key },
      update: { lastSentAt: now },
      create: { key, lastSentAt: now },
    });
    return true;
  }
}
