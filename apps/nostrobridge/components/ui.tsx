"use client";

import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { copyText } from "@/lib/format";

const ACCENTS = {
  none: "",
  bch: "before:bg-bch-500",
  nostr: "before:bg-nostr-400",
  amber: "before:bg-amber-300",
} as const;

export function Card({
  children,
  className = "",
  accent = "none",
}: {
  children: ReactNode;
  className?: string;
  accent?: keyof typeof ACCENTS;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900 p-5 shadow-[0_24px_80px_-48px_rgba(0,0,0,0.9)] before:absolute before:inset-x-0 before:top-0 before:h-px ${ACCENTS[accent]} ${className}`}
    >
      {children}
    </section>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const styles = {
    primary: "bg-bch-500 text-ink-950 hover:bg-bch-400",
    secondary: "border border-white/10 bg-white/[0.04] text-white hover:bg-white/10",
    danger: "bg-rose-500 text-white hover:bg-rose-400",
    ghost: "bg-transparent text-slate-300 hover:bg-white/5 hover:text-white",
  }[variant];
  return (
    <button
      className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bch-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "ok" | "warn" | "bad" | "neutral";
}) {
  const styles = {
    ok: "bg-bch-500/15 text-bch-400 border-bch-500/30",
    warn: "bg-amber-400/15 text-amber-200 border-amber-400/30",
    bad: "bg-rose-500/15 text-rose-200 border-rose-500/30",
    neutral: "bg-white/5 text-slate-300 border-white/10",
  }[tone];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${styles}`}>
      {children}
    </span>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="mt-4 block space-y-1.5 first:mt-0">
      <span className="text-[13px] font-medium text-slate-200">{label}</span>
      {children}
      {hint ? <span className="block text-xs leading-relaxed text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-bch-500/50 focus:ring-2 focus:ring-bch-500/30 ${props.className ?? ""}`}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-xs leading-relaxed text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-bch-500/50 focus:ring-2 focus:ring-bch-500/30 ${props.className ?? ""}`}
    />
  );
}

export function CodeBlock({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">record</span>
        <button
          type="button"
          className="rounded-full px-2 py-0.5 text-[11px] text-slate-300 hover:bg-white/10"
          onClick={async () => {
            await copyText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-80 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-slate-200">
        {value}
      </pre>
    </div>
  );
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
      {message}
    </p>
  );
}
