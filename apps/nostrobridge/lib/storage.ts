import {
  DEFAULT_RELAYS,
  importIdentityBinding,
  type BchNetwork,
  type IdentityBinding,
} from "@bchblaze/identity";
import { STORAGE_KEYS, siteConfig } from "./config";

export function loadRelays(): string[] {
  if (typeof window === "undefined") return [...DEFAULT_RELAYS];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.relays);
    if (!raw) return [...DEFAULT_RELAYS];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_RELAYS];
    const relays = parsed.filter((r): r is string => typeof r === "string" && r.startsWith("wss://"));
    return relays.length > 0 ? relays : [...DEFAULT_RELAYS];
  } catch {
    return [...DEFAULT_RELAYS];
  }
}

export function saveRelays(relays: string[]): void {
  localStorage.setItem(STORAGE_KEYS.relays, JSON.stringify(relays));
}

export function loadBinding(): IdentityBinding | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.binding);
    if (!raw) return null;
    return importIdentityBinding(raw);
  } catch {
    return null;
  }
}

export function saveBinding(binding: IdentityBinding): void {
  localStorage.setItem(STORAGE_KEYS.binding, JSON.stringify(binding));
}

export function clearBinding(): void {
  localStorage.removeItem(STORAGE_KEYS.binding);
}

export function loadNetwork(): BchNetwork {
  if (typeof window === "undefined") return siteConfig.defaultNetwork;
  const stored = localStorage.getItem(STORAGE_KEYS.network);
  if (stored === "mainnet" || stored === "chipnet" || stored === "testnet") {
    return stored;
  }
  return siteConfig.defaultNetwork;
}

export function saveNetwork(network: BchNetwork): void {
  localStorage.setItem(STORAGE_KEYS.network, network);
}
