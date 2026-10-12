import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Plan endpoints-app, lo L5 — GET /app/status (piblik). Reyitilize
// SystemSetting (deja egziste, jamè itilize jiska kounye a) — ZERO
// migrasyon. Modifye valè sa yo se jis yon UPDATE/INSERT sou SystemSetting,
// pa gen nouvo UI admin webapp pou kounye a (demann eksplisit).
const CACHE_TTL_MS = 60_000;

const SETTING_KEYS = {
  MAINTENANCE_ENABLED: 'app.maintenance.enabled',
  MAINTENANCE_MESSAGE_FR: 'app.maintenance.message.fr',
  MAINTENANCE_MESSAGE_HT: 'app.maintenance.message.ht',
  IOS_MIN_VERSION: 'app.ios.minVersion',
  IOS_LATEST_VERSION: 'app.ios.latestVersion',
  ANDROID_MIN_VERSION: 'app.android.minVersion',
  ANDROID_LATEST_VERSION: 'app.android.latestVersion',
  FLAG_KYC_VERSO: 'app.flag.KYC_VERSO_ENABLED',
  FLAG_KYC_PROFESSION_INCOME: 'app.flag.KYC_PROFESSION_INCOME_ENABLED',
  FLAG_KYC_MONCASH: 'app.flag.KYC_MONCASH_ENABLED',
  FLAG_CHAT_OZA: 'app.flag.CHAT_OZA_ENABLED',
} as const;

const DEFAULT_VERSION = '1.0.0';

export interface AppStatusDto {
  maintenance: { enabled: boolean; message: { fr: string | null; ht: string | null } };
  ios: { minVersion: string; latestVersion: string };
  android: { minVersion: string; latestVersion: string };
  flags: {
    KYC_VERSO_ENABLED: boolean;
    KYC_PROFESSION_INCOME_ENABLED: boolean;
    KYC_MONCASH_ENABLED: boolean;
    CHAT_OZA_ENABLED: boolean;
  };
}

function defaultStatus(): AppStatusDto {
  return {
    maintenance: { enabled: false, message: { fr: null, ht: null } },
    ios: { minVersion: DEFAULT_VERSION, latestVersion: DEFAULT_VERSION },
    android: { minVersion: DEFAULT_VERSION, latestVersion: DEFAULT_VERSION },
    flags: {
      KYC_VERSO_ENABLED: false,
      KYC_PROFESSION_INCOME_ENABLED: false,
      KYC_MONCASH_ENABLED: false,
      CHAT_OZA_ENABLED: false,
    },
  };
}

function toBool(value: string | undefined): boolean {
  return value === 'true';
}

@Injectable()
export class AppStatusService {
  private readonly logger = new Logger(AppStatusService.name);
  private cache: { data: AppStatusDto; expiresAt: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async getStatus(): Promise<AppStatusDto> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) {
      return this.cache.data;
    }

    const data = await this.readFromDb();
    this.cache = { data, expiresAt: now + CACHE_TTL_MS };
    return data;
  }

  // AUCUNE exception pa janm kite isit la — si DB pa reponn, konfig
  // "defo an sekirite" pi ba a toujou ranpli (maintenance off, flags off),
  // jamè yon 500. Menm filozofi ak app-env.ts/provider-mock.ts.
  private async readFromDb(): Promise<AppStatusDto> {
    const fallback = defaultStatus();
    try {
      const rows = await this.prisma.systemSetting.findMany({
        where: { key: { in: Object.values(SETTING_KEYS) } },
      });
      const byKey = new Map(rows.map((r) => [r.key, r.value]));
      const get = (key: string) => byKey.get(key);

      return {
        maintenance: {
          enabled: toBool(get(SETTING_KEYS.MAINTENANCE_ENABLED)),
          message: {
            fr: get(SETTING_KEYS.MAINTENANCE_MESSAGE_FR) ?? null,
            ht: get(SETTING_KEYS.MAINTENANCE_MESSAGE_HT) ?? null,
          },
        },
        ios: {
          minVersion: get(SETTING_KEYS.IOS_MIN_VERSION) ?? DEFAULT_VERSION,
          latestVersion: get(SETTING_KEYS.IOS_LATEST_VERSION) ?? get(SETTING_KEYS.IOS_MIN_VERSION) ?? DEFAULT_VERSION,
        },
        android: {
          minVersion: get(SETTING_KEYS.ANDROID_MIN_VERSION) ?? DEFAULT_VERSION,
          latestVersion:
            get(SETTING_KEYS.ANDROID_LATEST_VERSION) ?? get(SETTING_KEYS.ANDROID_MIN_VERSION) ?? DEFAULT_VERSION,
        },
        flags: {
          KYC_VERSO_ENABLED: toBool(get(SETTING_KEYS.FLAG_KYC_VERSO)),
          KYC_PROFESSION_INCOME_ENABLED: toBool(get(SETTING_KEYS.FLAG_KYC_PROFESSION_INCOME)),
          KYC_MONCASH_ENABLED: toBool(get(SETTING_KEYS.FLAG_KYC_MONCASH)),
          CHAT_OZA_ENABLED: toBool(get(SETTING_KEYS.FLAG_CHAT_OZA)),
        },
      };
    } catch (err) {
      this.logger.error(`Pa ka li SystemSetting pou /app/status — defo an sekirite itilize: ${(err as Error).message}`);
      return fallback;
    }
  }
}
