import type { BchNetwork } from "@bchblaze/identity";

function read(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : fallback;
}

export const siteConfig = {
  name: "Nostrobridge",
  widgetFactoryUrl: read(
    "NEXT_PUBLIC_WIDGET_FACTORY_URL",
    "https://docs.google.com/presentation/d/1Yfuk9CJkf4U9M_WukcELhumWgj3Ak6345Ewy8hSp-Hk/edit?usp=sharing"
  ),
  githubUrl: read("NEXT_PUBLIC_GITHUB_URL", "https://github.com/your-org/bchblaze"),
  ember2026Address: read(
    "NEXT_PUBLIC_EMBER2026_ADDRESS",
    "bitcoincash:zpln0flvp7gcx6qncy6rrrtj8eqnzman3syf09q2eq"
  ),
  defaultNetwork: read("NEXT_PUBLIC_NETWORK", "mainnet") as BchNetwork,
  defaultAmountBch: read("NEXT_PUBLIC_DEFAULT_AMOUNT_BCH", "0.0001"),
  paytacaInstallUrl:
    "https://chromewebstore.google.com/detail/paytaca/pakphhpnedgpnpcjcfgbnhokogkghjdm",
};

export const STORAGE_KEYS = {
  relays: "nostrobridge:relays",
  binding: "nostrobridge:binding",
  network: "nostrobridge:network",
} as const;
