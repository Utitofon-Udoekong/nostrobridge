import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nostrobridge",
  description: "Bind a Bitcoin Cash address to a Nostr key.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
            <Nav />
            <main className="px-6 py-10 lg:px-12 lg:py-14">
              <div className="mx-auto max-w-3xl">{children}</div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
