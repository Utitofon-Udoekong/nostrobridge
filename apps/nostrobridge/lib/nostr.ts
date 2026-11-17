import type { NostrEvent, UnsignedNostrEvent } from "@bchblaze/identity";
import { parseNostrPubkey } from "./format";

export interface Nip07 {
  getPublicKey: () => Promise<string>;
  signEvent: (event: {
    kind: number;
    created_at: number;
    tags: string[][];
    content: string;
  }) => Promise<NostrEvent>;
}

export function getNip07(): Nip07 | null {
  if (typeof window === "undefined") return null;
  const nostr = (window as Window & { nostr?: Nip07 }).nostr;
  return nostr ?? null;
}

export async function connectNip07(): Promise<string> {
  const nip07 = getNip07();
  if (!nip07) {
    throw new Error("No NIP-07 extension found. Install nos2x or Alby, or paste an npub.");
  }
  return parseNostrPubkey(await nip07.getPublicKey());
}

export async function signWithNip07(unsigned: UnsignedNostrEvent): Promise<NostrEvent> {
  const nip07 = getNip07();
  if (!nip07) {
    throw new Error("No NIP-07 extension available to sign");
  }
  const signed = await nip07.signEvent({
    kind: unsigned.kind,
    created_at: unsigned.created_at,
    tags: unsigned.tags,
    content: unsigned.content,
  });
  if (!signed?.id || !signed.sig) {
    throw new Error("NIP-07 did not return a signed event");
  }
  return signed;
}

export function parseSignedEventJson(raw: string): NostrEvent {
  const parsed = JSON.parse(raw) as NostrEvent;
  if (
    typeof parsed.id !== "string" ||
    typeof parsed.pubkey !== "string" ||
    typeof parsed.sig !== "string" ||
    typeof parsed.content !== "string"
  ) {
    throw new Error("Not a NIP-01 event");
  }
  return parsed;
}
