import { crypto } from 'bitcoinjs-lib';
import { base58check } from '@scure/base';

export type ErrorCode = 'secret' | 'size' | 'complexity' | 'checksum' | 'key' | 'network' | 'networkRequired' | 'scriptConflict' | 'descriptor' | 'range' | 'change' | 'timeout' | 'font';
export class WalletError extends Error { constructor(public code: ErrorCode) { super(code); } }
const b58 = base58check(crypto.sha256);

/** Resource/secret preflight only. Descriptor grammar and scripts are handled by BitcoinerLAB. */
export function preflight(input: string): void {
  if (input.length > 8192) throw new WalletError('size');
  if (/(?:[xtyzuvYZUV]prv|\b(?:seed|mnemonic|private_key|xprv)\b)/i.test(input) || /^[a-fA-F0-9]{64}$/.test(input.trim()) || input.trim().split(/\s+/).length >= 12) throw new WalletError('secret');
  let depth=0, nodes=0;
  for (const c of input) {
    if (c==='(' || c==='{') { depth++; nodes++; }
    if (c===')' || c==='}') depth--;
    if (depth > 24 || nodes > 96) throw new WalletError('complexity');
  }
  // A Base58Check private key can be embedded in a descriptor. Never pass it to the parser.
  for (const token of input.match(/[A-Za-z0-9]+/g) ?? []) {
    if (token.length < 50 || token.length > 120) continue;
    let bytes: Uint8Array;
    try { bytes=b58.decode(token); } catch { continue; }
    if ((bytes.length===33 || bytes.length===34) && (bytes[0]===0x80 || bytes[0]===0xef)) throw new WalletError('secret');
    if (bytes.length===78 && bytes[45]===0) throw new WalletError('secret');
  }
}
