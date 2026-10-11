import { isStaging } from './app-env';

// StroWallet, ZiiroPay, BSICards and MonCashConnect don't offer a sandbox —
// their only environment is the real one, moving real money/cards. In
// staging we never make the real HTTP call; call sites ask this module for
// a mock response instead (see mock*Response below). This function is the
// defense-in-depth backstop: it must be called immediately before every
// real axios/fetch call to one of these providers, so that even if a future
// call site forgets to branch on isStaging() first, the real call still
// can't go through — it throws instead.
export class StagingRealProviderCallBlockedError extends Error {
  constructor(provider: string) {
    super(`Fail-closed: tantativ apèl HTTP REYÈL bay ${provider} an APP_ENV=staging — bloke.`);
  }
}

export function assertNoRealProviderCallInStaging(provider: string): void {
  if (isStaging()) throw new StagingRealProviderCallBlockedError(provider);
}

// Deliberately generic, not a byte-exact replica of any real provider
// response — good enough to exercise success/failure code paths in staging
// without ever touching the real APIs. Tunable via env so a staging run can
// be made deterministic (0) or stress-tested (closer to 1) without a redeploy.
const STAGING_FAILURE_RATE = Number(process.env.STAGING_MOCK_FAILURE_RATE ?? 0.1);

function shouldSimulateFailure(): boolean {
  return Math.random() < STAGING_FAILURE_RATE;
}

function stagingId(prefix: string): string {
  return `STAGING-${prefix}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

// ── StroWallet / ZiiroPay (virtual cards) ───────────────────────────────────
// Mirrors the {success/status, response:{...}} shape nfcPost/nfcGet callers
// already check (data?.success === false → throws) — reusing that existing
// handling means the mock only has to swap in for the HTTP call itself.
export function mockStrowalletResponse(endpoint: string): any {
  if (shouldSimulateFailure()) {
    return { success: false, response: { message: `Staging mock: echèk simile pou ${endpoint}` } };
  }
  switch (endpoint) {
    case 'cardkyc':
    case 'cardkycstatus':
      return { success: true, response: { customer_id: stagingId('CUST'), status: 'approved' } };
    case 'create-nfc-card':
      return { success: true, response: { card_id: stagingId('CARD') } };
    case 'fetch-nfccard-detail':
      return {
        success: true,
        response: {
          card_detail: {
            card_number: '4000000000000000',
            cvv: '000',
            expiry: '12/30',
            card_holder_name: 'STAGING TEST',
            balance: '0.00',
            last4: '0000',
          },
        },
      };
    default:
      return { success: true, response: {} };
  }
}

// ── BSICards (newvisa / corpexpenses-mastercard-usd / mastercard-euro) ──────
export function mockBsicardsResponse(endpoint: string): any {
  if (shouldSimulateFailure()) {
    return { success: false, response: { message: `Staging mock: echèk simile pou ${endpoint}` } };
  }
  if (endpoint === 'newvisa/create-card') {
    return {
      success: true,
      response: {
        cardid: stagingId('BSI'),
        address: 'TStagingMockNotARealTronAddress000000',
        network: 'TRON',
        min_deposit: 4,
      },
    };
  }
  if (endpoint === 'corpexpenses-mastercard-usd/create-card') {
    return { success: true, response: { cardid: stagingId('BSIUSD') } };
  }
  if (endpoint === 'mastercard-euro/create-card') {
    return { success: true, response: { cardid: stagingId('BSIEUR') } };
  }
  if (endpoint === 'mastercard-euro/get-sensitive-card') {
    return { success: true, response: { data: { uri: mockBsicardsSensitiveCardScriptUrl() } } };
  }
  return { success: true, response: {} };
}

// mastercard-euro/get-sensitive-card doesn't return card data directly — it
// returns a URL to a JS snippet (on a THIRD domain, business.4payments.io)
// that the real code fetches as text and regexes a `var url = "..."` out of.
// Faking that whole chain realistically isn't worth it; the mock short-
// circuits by returning a scriptUrl that already matches the expected shape.
export function mockBsicardsSensitiveCardScriptUrl(): string {
  return 'https://staging-mock.ozamapay.invalid/sensitive-card-script.js';
}

export function mockBsicardsSensitiveCardScriptBody(): string {
  return 'var url = "https://staging-mock.ozamapay.invalid/card-detail-iframe";';
}

// ── MonCashConnect (payment) ────────────────────────────────────────────────
export function mockMoncashPayCreateResponse(): any {
  return { paymentUrl: 'https://staging-mock.ozamapay.invalid/pay', reference: stagingId('MONCASH') };
}

export function mockMoncashPayStatusResponse(): any {
  return shouldSimulateFailure() ? { status: 'FAILED' } : { status: 'COMPLETED' };
}
