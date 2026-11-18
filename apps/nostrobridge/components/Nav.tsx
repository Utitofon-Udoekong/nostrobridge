"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";

const LINKS = [
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
    <header className="border-b border-ink lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4 lg:flex-col lg:items-stretch lg:px-6 lg:py-8">
        <Link href="/" className="flex items-center gap-3 text-ink no-underline">
          <Logo />
          <span className="text-base font-medium tracking-tight">Nostrobridge</span>
        </Link>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 lg:mt-8 lg:flex-col lg:gap-1">
          {LINKS.map((link) => {
            const active = path === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`py-1 text-sm no-underline ${active ? "underline decoration-ink decoration-2 underline-offset-8" : "text-ink/60"}`}
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
