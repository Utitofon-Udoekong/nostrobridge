import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Serif, Outfit } from "next/font/google";
import { BINDING_KIND } from "@bchblaze/identity";
import { Banner } from "@/components/Banner";
import { Nav } from "@/components/Nav";
import { Providers } from "./providers";
import "./globals.css";

const sans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Nostrobridge — BCH ↔ Nostr identity",
  description:
    "Cryptographically bind a Bitcoin Cash address to a Nostr npub. Dual proofs, relay discovery, offline verification.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Banner />
        <Providers>
          <Nav />
          <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
          <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 pb-10 text-xs text-slate-500 sm:px-6">
            <span>bchblaze-id · kind {BINDING_KIND} · keys stay in the wallet</span>
            <span>Relays host the record. They cannot forge it.</span>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
