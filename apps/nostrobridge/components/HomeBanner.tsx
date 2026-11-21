"use client";

import { usePathname } from "next/navigation";

const PRESENTATION = "https://docs.google.com/presentation/d/1xXuMJabCT37gEmyWFrLNhLbdS-MZ2b4ajE7Bif-I644/edit?usp=sharing";
const GITHUB = "https://github.com/Utitofon-Udoekong/nostrobridge";
const EMBER = "bitcoincash:zrf7lfu7ec657h69me9wm8ye04w36nxfzy6jdvqeqd";

export function HomeBanner() {
  const path = usePathname();
  if (path !== "/") return null;

  return (
    <div className="border-b border-ink bg-ink !text-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-2.5 text-sm">
        <a className="!text-paper" href={PRESENTATION} target="_blank" rel="noreferrer">
          Presentation
        </a>
        <a className="!text-paper" href={GITHUB} target="_blank" rel="noreferrer">
          GitHub
        </a>
        <a
          className="break-all font-mono text-xs !text-paper"
          href={`https://blockchair.com/bitcoin-cash/address/${EMBER.replace(/^bitcoincash:/, "")}`}
          target="_blank"
          rel="noreferrer"
          title="EMBER2026 donations"
        >
          EMBER2026 {EMBER}
        </a>
      </div>
    </div>
  );
}
