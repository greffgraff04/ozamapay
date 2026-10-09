describe('app-env', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.resetModules();
  });

  function load() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('./app-env');
  }

  describe('isStaging', () => {
    it('is false when APP_ENV is unset (today\'s prod behavior)', () => {
      delete process.env.APP_ENV;
      expect(load().isStaging()).toBe(false);
    });

    it('is false when APP_ENV=production', () => {
      process.env.APP_ENV = 'production';
      expect(load().isStaging()).toBe(false);
    });

    it('is true only when APP_ENV=staging exactly', () => {
      process.env.APP_ENV = 'staging';
      expect(load().isStaging()).toBe(true);
    });
  });

  describe('assertStagingNotUsingProdDatabase', () => {
    it('is a no-op when APP_ENV is unset, regardless of DATABASE_URL', () => {
      delete process.env.APP_ENV;
      process.env.DATABASE_URL = 'postgres://user:pass@host/neondb';
      expect(() => load().assertStagingNotUsingProdDatabase()).not.toThrow();
    });

    it('is a no-op when APP_ENV=production, regardless of DATABASE_URL', () => {
      process.env.APP_ENV = 'production';
      process.env.DATABASE_URL = 'postgres://user:pass@host/neondb';
      expect(() => load().assertStagingNotUsingProdDatabase()).not.toThrow();
    });

    it('throws when APP_ENV=staging and DATABASE_URL points at the prod db (neondb)', () => {
      process.env.APP_ENV = 'staging';
      process.env.DATABASE_URL = 'postgres://user:pass@host/neondb?sslmode=require';
      expect(() => load().assertStagingNotUsingProdDatabase()).toThrow();
    });

    it('never includes the DATABASE_URL value in the thrown message', () => {
      process.env.APP_ENV = 'staging';
      process.env.DATABASE_URL = 'postgres://secretuser:secretpass@host/neondb';
      try {
        load().assertStagingNotUsingProdDatabase();
        fail('expected throw');
      } catch (err: any) {
        expect(err.message).not.toContain('secretpass');
        expect(err.message).not.toContain('secretuser');
      }
    });

    it('does not throw when APP_ENV=staging and DATABASE_URL points at a non-prod db', () => {
      process.env.APP_ENV = 'staging';
      process.env.DATABASE_URL = 'postgres://user:pass@host/ozamapay_staging';
      expect(() => load().assertStagingNotUsingProdDatabase()).not.toThrow();
    });
  });

  describe('defaultTrongridBaseUrlForNetwork', () => {
    it('defaults to mainnet (api.trongrid.io) when TRON_NETWORK is unset — unchanged prod behavior', () => {
      delete process.env.TRON_NETWORK;
      expect(load().defaultTrongridBaseUrlForNetwork()).toBe('https://api.trongrid.io');
    });

    it('defaults to mainnet when TRON_NETWORK=mainnet', () => {
      process.env.TRON_NETWORK = 'mainnet';
      expect(load().defaultTrongridBaseUrlForNetwork()).toBe('https://api.trongrid.io');
    });

    it('switches to nile testnet when TRON_NETWORK=nile', () => {
      process.env.TRON_NETWORK = 'nile';
      expect(load().defaultTrongridBaseUrlForNetwork()).toBe('https://nile.trongrid.io');
    });

    it('switches to nile testnet when TRON_NETWORK=testnet', () => {
      process.env.TRON_NETWORK = 'testnet';
      expect(load().defaultTrongridBaseUrlForNetwork()).toBe('https://nile.trongrid.io');
    });
  });

  describe('assertTronManualTriggerAllowedInStaging (admin /admin/sweep/run, /admin/reconciliation/run)', () => {
    it('is a no-op when APP_ENV is unset, regardless of TRON_NETWORK — unchanged prod behavior', () => {
      delete process.env.APP_ENV;
      delete process.env.TRON_NETWORK;
      expect(() => load().assertTronManualTriggerAllowedInStaging()).not.toThrow();
    });

    it('is a no-op when APP_ENV=production, regardless of TRON_NETWORK', () => {
      process.env.APP_ENV = 'production';
      delete process.env.TRON_NETWORK;
      expect(() => load().assertTronManualTriggerAllowedInStaging()).not.toThrow();
    });

    it('throws in staging when TRON_NETWORK is unset', () => {
      process.env.APP_ENV = 'staging';
      delete process.env.TRON_NETWORK;
      expect(() => load().assertTronManualTriggerAllowedInStaging()).toThrow(/TRON_NETWORK/);
    });

    it('throws in staging when TRON_NETWORK=mainnet', () => {
      process.env.APP_ENV = 'staging';
      process.env.TRON_NETWORK = 'mainnet';
      expect(() => load().assertTronManualTriggerAllowedInStaging()).toThrow(/TRON_NETWORK/);
    });

    it('does not throw in staging when TRON_NETWORK=nile', () => {
      process.env.APP_ENV = 'staging';
      process.env.TRON_NETWORK = 'nile';
      expect(() => load().assertTronManualTriggerAllowedInStaging()).not.toThrow();
    });

    it('does not throw in staging when TRON_NETWORK=testnet', () => {
      process.env.APP_ENV = 'staging';
      process.env.TRON_NETWORK = 'testnet';
      expect(() => load().assertTronManualTriggerAllowedInStaging()).not.toThrow();
    });
  });

  describe('logStagingProviderReadiness', () => {
    it('never throws, in staging or otherwise, regardless of which secrets are set', () => {
      delete process.env.APP_ENV;
      expect(() => load().logStagingProviderReadiness()).not.toThrow();

      jest.resetModules();
      process.env.APP_ENV = 'staging';
      delete process.env.TRON_MASTER_MNEMONIC;
      delete process.env.SWEEP_MASTER_MNEMONIC;
      delete process.env.RELOADLY_CLIENT_ID;
      delete process.env.RELOADLY_CLIENT_SECRET;
      delete process.env.MONCASH_MODE;
      expect(() => load().logStagingProviderReadiness()).not.toThrow();
    });

    it('is a no-op (no console output) when APP_ENV is unset', () => {
      delete process.env.APP_ENV;
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      load().logStagingProviderReadiness();
      expect(logSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      logSpy.mockRestore();
      warnSpy.mockRestore();
    });
  });
});
