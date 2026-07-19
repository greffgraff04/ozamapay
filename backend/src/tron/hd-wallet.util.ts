import * as bip39 from 'bip39';
import HDKey from 'hdkey';
import { TronWeb } from 'tronweb';

// BIP44 path for Tron: m/44'/195'/0'/0/{index}
const derivationPath = (index: number) => `m/44'/195'/0'/0/${index}`;

function getMasterSeed(): Buffer {
  const mnemonic = process.env.TRON_MASTER_MNEMONIC;
  if (!mnemonic) {
    throw new Error('TRON_MASTER_MNEMONIC pa konfigire nan .env');
  }
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error('TRON_MASTER_MNEMONIC pa yon mnemonic BIP39 valid');
  }
  return bip39.mnemonicToSeedSync(mnemonic);
}

function derivePrivateKey(index: number): string {
  const seed = getMasterSeed();
  const root = HDKey.fromMasterSeed(seed);
  const child = root.derive(derivationPath(index));
  if (!child.privateKey) {
    throw new Error(`Derivasyon kle prive echwe pou endeks ${index}`);
  }
  return child.privateKey.toString('hex');
}

// Deterministically derives the deposit address for a given BIP44 index.
// No private key material is ever persisted — only `index` is stored
// (as DepositAddress.derivationIndex), and this function re-derives the
// address on demand from the master mnemonic (env var only).
export function deriveTronAddress(index: number): string {
  const privateKeyHex = derivePrivateKey(index);
  const address = TronWeb.address.fromPrivateKey(privateKeyHex);
  if (!address) {
    throw new Error(`Jenerasyon adrès echwe pou endeks ${index}`);
  }
  return address;
}

// Reserved for the future sweep phase (moving swept USDT out of each
// deposit address into the treasury wallet). Not called anywhere yet —
// kept next to deriveTronAddress so both always use the exact same
// derivation logic. Never log or persist the returned value.
export function deriveTronPrivateKey(index: number): string {
  return derivePrivateKey(index);
}
