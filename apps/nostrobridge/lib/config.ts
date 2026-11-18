import type { BchNetwork } from "@bchblaze/identity";

function read(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : fallback;
}

export const siteConfig = {
  name: "Nostrobridge",
  defaultNetwork: read("NEXT_PUBLIC_NETWORK", "mainnet") as BchNetwork,
  defaultAmountBch: read("NEXT_PUBLIC_DEFAULT_AMOUNT_BCH", "0.0001"),
  paytacaInstallUrl: "https://chromewebstore.google.com/detail/paytaca/pakphhpnedgpnpcjcfgbnhokogkghjdm",
};

export const STORAGE_KEYS = {
  relays: "nostrobridge:relays",
  binding: "nostrobridge:binding",
  network: "nostrobridge:network",
} as const;
