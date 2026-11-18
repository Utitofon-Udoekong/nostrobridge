"use client";

import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { copyText } from "@/lib/format";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
  accent?: string;
}) {
  return <section className={`border border-ink bg-paper p-5 ${className}`}>{children}</section>;
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
    primary: "bg-ink text-paper hover:opacity-80",
    secondary: "border border-ink bg-paper text-ink hover:bg-ink hover:text-paper",
    danger: "border border-ink bg-paper text-ink hover:bg-ink hover:text-paper",
    ghost: "bg-transparent text-ink/70 hover:text-ink",
  }[variant];
  return (
    <button
      className={`inline-flex items-center justify-center px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Pill({
  children,
}: {
  children: ReactNode;
  tone?: "ok" | "warn" | "bad" | "neutral";
}) {
  return <span className="text-xs uppercase tracking-wide text-ink/70">{children}</span>;
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
      <span className="text-xs uppercase tracking-wide text-ink/60">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-ink/60">{hint}</span> : null}
    </label>
  );
}

const control =
  "w-full border border-ink bg-paper px-3 py-2 font-mono text-sm text-ink outline-none placeholder:text-ink/40";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${control} ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${control} text-xs ${props.className ?? ""}`} />;
}

export function CodeBlock({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden border border-ink">
      <div className="flex justify-end border-b border-ink px-2 py-1">
        <button
          type="button"
          className="text-xs text-ink/60 hover:text-ink"
          onClick={async () => {
            await copyText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-64 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-ink">{value}</pre>
    </div>
  );
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="border border-ink px-3 py-2 text-sm">{message}</p>;
}
