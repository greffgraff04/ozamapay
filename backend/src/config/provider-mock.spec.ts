describe('provider-mock', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.resetModules();
  });

  function load() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('./provider-mock');
  }

  describe('assertNoRealProviderCallInStaging (fail-closed backstop)', () => {
    it('throws when APP_ENV=staging, for any provider name', () => {
      process.env.APP_ENV = 'staging';
      const { assertNoRealProviderCallInStaging, StagingRealProviderCallBlockedError } = load();
      expect(() => assertNoRealProviderCallInStaging('StroWallet/ZiiroPay')).toThrow(
        StagingRealProviderCallBlockedError,
      );
      expect(() => assertNoRealProviderCallInStaging('BSICards')).toThrow();
      expect(() => assertNoRealProviderCallInStaging('MonCashConnect')).toThrow();
    });

    it('is a no-op when APP_ENV is unset (today\'s prod behavior, zero regression)', () => {
      delete process.env.APP_ENV;
      const { assertNoRealProviderCallInStaging } = load();
      expect(() => assertNoRealProviderCallInStaging('StroWallet/ZiiroPay')).not.toThrow();
    });

    it('is a no-op when APP_ENV=production', () => {
      process.env.APP_ENV = 'production';
      const { assertNoRealProviderCallInStaging } = load();
      expect(() => assertNoRealProviderCallInStaging('BSICards')).not.toThrow();
    });
  });

  describe('mockStrowalletResponse', () => {
    beforeEach(() => {
      process.env.STAGING_MOCK_FAILURE_RATE = '0';
    });

    it('never needs a real HTTP call — returns usable shapes for every known endpoint', () => {
      const { mockStrowalletResponse } = load();

      const kyc = mockStrowalletResponse('cardkyc');
      expect(kyc.success).toBe(true);
      expect(kyc.response.customer_id).toBeTruthy();
      expect(kyc.response.status).toBe('approved');

      const create = mockStrowalletResponse('create-nfc-card');
      expect(create.response.card_id).toBeTruthy();

      const detail = mockStrowalletResponse('fetch-nfccard-detail');
      expect(detail.response.card_detail.card_number).toBeTruthy();

      const unknown = mockStrowalletResponse('some-future-endpoint');
      expect(unknown.success).toBe(true);
    });

    it('can simulate failures through the existing success===false handling path', () => {
      process.env.STAGING_MOCK_FAILURE_RATE = '1';
      const { mockStrowalletResponse } = load();
      const res = mockStrowalletResponse('cardkyc');
      expect(res.success).toBe(false);
    });
  });

  describe('mockBsicardsResponse', () => {
    beforeEach(() => {
      process.env.STAGING_MOCK_FAILURE_RATE = '0';
    });

    it('returns a cardid for every create-card variant', () => {
      const { mockBsicardsResponse } = load();
      expect(mockBsicardsResponse('newvisa/create-card').response.cardid).toBeTruthy();
      expect(mockBsicardsResponse('newvisa/create-card').response.address).toBeTruthy();
      expect(mockBsicardsResponse('corpexpenses-mastercard-usd/create-card').response.cardid).toBeTruthy();
      expect(mockBsicardsResponse('mastercard-euro/create-card').response.cardid).toBeTruthy();
    });

    it('returns a script-url shape for mastercard-euro/get-sensitive-card so getSecretDetails\' extraction logic finds it', () => {
      const { mockBsicardsResponse, mockBsicardsSensitiveCardScriptUrl } = load();
      const res = mockBsicardsResponse('mastercard-euro/get-sensitive-card');
      expect(res.response.data.uri).toBe(mockBsicardsSensitiveCardScriptUrl());
    });

    it('the mock script body matches the var url="..." regex the real code parses', () => {
      const { mockBsicardsSensitiveCardScriptBody } = load();
      const match = mockBsicardsSensitiveCardScriptBody().match(/var\s+url\s*=\s*"([^"]+)"/);
      expect(match).toBeTruthy();
    });
  });

  describe('mockMoncash*', () => {
    it('pay-create mock has a paymentUrl and reference', () => {
      const { mockMoncashPayCreateResponse } = load();
      const res = mockMoncashPayCreateResponse();
      expect(res.paymentUrl).toBeTruthy();
      expect(res.reference).toBeTruthy();
    });

    it('pay-status mock returns a recognised status', () => {
      process.env.STAGING_MOCK_FAILURE_RATE = '0';
      const { mockMoncashPayStatusResponse } = load();
      expect(['COMPLETED', 'FAILED']).toContain(mockMoncashPayStatusResponse().status);
    });
  });
});
