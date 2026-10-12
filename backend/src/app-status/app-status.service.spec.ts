import { AppStatusService } from './app-status.service';

function buildFakePrisma(rows: Array<{ key: string; value: string }> = []) {
  return {
    rows,
    systemSetting: {
      findMany: jest.fn(async () => rows),
    },
  };
}

describe('AppStatusService — valeurs par défaut sûres (rien en base)', () => {
  it('renvoie maintenance=false, flags=false, versions=1.0.0, jamais une exception', async () => {
    const fakePrisma = buildFakePrisma([]);
    const service = new AppStatusService(fakePrisma as any);

    const status = await service.getStatus();

    expect(status).toEqual({
      maintenance: { enabled: false, message: { fr: null, ht: null } },
      ios: { minVersion: '1.0.0', latestVersion: '1.0.0' },
      android: { minVersion: '1.0.0', latestVersion: '1.0.0' },
      flags: {
        KYC_VERSO_ENABLED: false,
        KYC_PROFESSION_INCOME_ENABLED: false,
        KYC_MONCASH_ENABLED: false,
        CHAT_OZA_ENABLED: false,
      },
    });
  });

  it('ne lève jamais d\'exception même si la lecture DB échoue (jamais de 500)', async () => {
    const fakePrisma = { systemSetting: { findMany: jest.fn().mockRejectedValue(new Error('DB down')) } };
    const service = new AppStatusService(fakePrisma as any);

    const status = await service.getStatus();

    expect(status.maintenance.enabled).toBe(false);
    expect(status.flags.CHAT_OZA_ENABLED).toBe(false);
  });
});

describe('AppStatusService — valeurs configurées en base (SystemSetting)', () => {
  it('reflète les valeurs réellement en base', async () => {
    const fakePrisma = buildFakePrisma([
      { key: 'app.maintenance.enabled', value: 'true' },
      { key: 'app.maintenance.message.fr', value: 'Maintenance en cours' },
      { key: 'app.maintenance.message.ht', value: 'Maintenans ap fèt' },
      { key: 'app.ios.minVersion', value: '2.1.0' },
      { key: 'app.ios.latestVersion', value: '2.3.0' },
      { key: 'app.android.minVersion', value: '2.0.0' },
      { key: 'app.flag.CHAT_OZA_ENABLED', value: 'true' },
    ]);
    const service = new AppStatusService(fakePrisma as any);

    const status = await service.getStatus();

    expect(status.maintenance).toEqual({
      enabled: true,
      message: { fr: 'Maintenance en cours', ht: 'Maintenans ap fèt' },
    });
    expect(status.ios).toEqual({ minVersion: '2.1.0', latestVersion: '2.3.0' });
    // android.latestVersion non configuré → retombe sur minVersion configuré (2.0.0), pas sur le défaut global 1.0.0
    expect(status.android).toEqual({ minVersion: '2.0.0', latestVersion: '2.0.0' });
    expect(status.flags.CHAT_OZA_ENABLED).toBe(true);
    expect(status.flags.KYC_VERSO_ENABLED).toBe(false);
  });

  it('une valeur autre que la chaîne "true" est traitée comme false (fail-safe)', async () => {
    const fakePrisma = buildFakePrisma([{ key: 'app.maintenance.enabled', value: 'yes' }]);
    const service = new AppStatusService(fakePrisma as any);

    const status = await service.getStatus();

    expect(status.maintenance.enabled).toBe(false);
  });
});

describe('AppStatusService — cache 60s', () => {
  it('ne relit pas la DB avant expiration du cache', async () => {
    const fakePrisma = buildFakePrisma([]);
    const service = new AppStatusService(fakePrisma as any);

    await service.getStatus();
    await service.getStatus();
    await service.getStatus();

    expect(fakePrisma.systemSetting.findMany).toHaveBeenCalledTimes(1);
  });

  it('relit la DB après expiration du cache', async () => {
    jest.useFakeTimers();
    const fakePrisma = buildFakePrisma([]);
    const service = new AppStatusService(fakePrisma as any);

    await service.getStatus();
    jest.advanceTimersByTime(61_000);
    await service.getStatus();

    expect(fakePrisma.systemSetting.findMany).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});
