import * as bip39 from 'bip39';
import HDKey from 'hdkey';
import { TronWeb } from 'tronweb';

// BIP44 path for Tron: m/44'/195'/0'/0/{index}
const derivationPath = (index: number) => `m/44'/195'/0'/0/${index}`;

function seedFromMnemonic(mnemonic: string): Buffer {
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error('Mnemonic BIP39 pa valid');
  }
  return bip39.mnemonicToSeedSync(mnemonic);
}

function privateKeyFromMnemonic(mnemonic: string, index: number): string {
  const seed = seedFromMnemonic(mnemonic);
  const root = HDKey.fromMasterSeed(seed);
  const child = root.derive(derivationPath(index));
  if (!child.privateKey) {
    throw new Error(`Derivasyon kle prive echwe pou endeks ${index}`);
  }
  return child.privateKey.toString('hex');
}

function addressFromPrivateKey(privateKeyHex: string, index: number): string {
  const address = TronWeb.address.fromPrivateKey(privateKeyHex);
  if (!address) {
    throw new Error(`Jenerasyon adrès echwe pou endeks ${index}`);
  }
  return address;
}

function getEnvMnemonic(envVar: string): string {
  const mnemonic = process.env[envVar];
  if (!mnemonic) {
    throw new Error(`${envVar} pa konfigire nan .env`);
  }
  return mnemonic;
}

// ─── User deposit addresses (TRON_MASTER_MNEMONIC) ──────────────────────
// No private key material is ever persisted — only `index` is stored
// (as DepositAddress.derivationIndex), and these functions re-derive the
// address/key on demand from the master mnemonic (env var only).

export function deriveTronAddress(index: number): string {
  const mnemonic = getEnvMnemonic('TRON_MASTER_MNEMONIC');
  const privateKeyHex = privateKeyFromMnemonic(mnemonic, index);
  return addressFromPrivateKey(privateKeyHex, index);
}

// Used by the sweep phase to sign "move USDT to treasury" transactions
// from each user deposit address. Never log or persist the returned value.
export function deriveTronPrivateKey(index: number): string {
  const mnemonic = getEnvMnemonic('TRON_MASTER_MNEMONIC');
  return privateKeyFromMnemonic(mnemonic, index);
}

// ─── Treasury / sweep destination wallet (SWEEP_MASTER_MNEMONIC) ────────
// Completely separate mnemonic from TRON_MASTER_MNEMONIC. Always index 0
// — there is only ever one treasury address.
const TREASURY_INDEX = 0;

export function getTreasuryAddress(): string {
  const mnemonic = getEnvMnemonic('SWEEP_MASTER_MNEMONIC');
  const privateKeyHex = privateKeyFromMnemonic(mnemonic, TREASURY_INDEX);
  return addressFromPrivateKey(privateKeyHex, TREASURY_INDEX);
}

// Never log or persist the returned value.
export function getTreasuryPrivateKey(): string {
  const mnemonic = getEnvMnemonic('SWEEP_MASTER_MNEMONIC');
  return privateKeyFromMnemonic(mnemonic, TREASURY_INDEX);
}
