"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/link", label: "Bind" },
  { href: "/verify", label: "Verify" },
  { href: "/authenticate", label: "Auth" },
  { href: "/pay", label: "Pay" },
  { href: "/anchor", label: "Anchor" },
  { href: "/settings", label: "Relays" },
] as const;

export function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/75 backdrop-blur-md" suppressHydrationWarning>
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 text-white no-underline">
          <Mark />
          <span className="text-[15px] font-semibold tracking-tight">Nostrobridge</span>
        </Link>
        <nav className="no-scrollbar flex gap-0.5 overflow-x-auto sm:min-w-0 sm:flex-1 sm:justify-end">
          {LINKS.map((link) => {
            const active = path === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm no-underline transition ${
                  active
                    ? "bg-white text-ink-950"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

function Mark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden className="shrink-0">
      <rect width="28" height="28" rx="9" fill="#101820" />
      <path d="M6.5 17.5c3.2-7 11.8-7 15 0" stroke="#3ee6b0" strokeWidth="1.6" fill="none" />
      <circle cx="7.5" cy="11" r="2.1" fill="#0ac18e" />
      <circle cx="20.5" cy="11" r="2.1" fill="#8b7cff" />
    </svg>
  );
}
