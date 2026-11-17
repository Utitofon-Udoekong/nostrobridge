import { nip19 } from "nostr-tools";
import { normalizeNostrPubkey } from "@bchblaze/identity";

export function parseNostrPubkey(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Nostr pubkey is empty");
  if (trimmed.startsWith("npub1")) {
    const decoded = nip19.decode(trimmed);
    if (decoded.type !== "npub") {
      throw new Error("Expected an npub");
    }
    return decoded.data;
  }
  return normalizeNostrPubkey(trimmed);
}

export function toNpub(hex: string): string {
  return nip19.npubEncode(hex);
}

export function shortHex(value: string, size = 8): string {
  if (value.length <= size * 2) return value;
  return `${value.slice(0, size)}…${value.slice(-size)}`;
}

export function formatUnix(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString();
}

export function bip21Uri(cashaddr: string, amountBch?: string): string {
  if (!amountBch || Number(amountBch) <= 0) return cashaddr;
  const sep = cashaddr.includes("?") ? "&" : "?";
  return `${cashaddr}${sep}amount=${amountBch}`;
}

export function explorerAddressUrl(cashaddr: string, network: string): string {
  if (network === "chipnet" || network === "testnet") {
    return `https://chipnet.chaingraph.cash/address/${cashaddr}`;
  }
  return `https://blockchair.com/bitcoin-cash/address/${cashaddr.replace(/^bitcoincash:/, "")}`;
}

export async function copyText(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
}

export function cashaddrFromPubkeyBytes(
  pubkey: Uint8Array,
  encode: (hash: Uint8Array) => string,
  hash160: (data: Uint8Array) => Uint8Array
): string {
  let compressed = pubkey;
  if (pubkey.length === 32) {
    compressed = new Uint8Array(33);
    compressed[0] = 0x02;
    compressed.set(pubkey, 1);
  }
  if (compressed.length !== 33 && compressed.length !== 65) {
    throw new Error("Unexpected pubkey length");
  }
  return encode(hash160(compressed));
}
