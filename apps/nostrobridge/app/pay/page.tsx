"use client";

import { useEffect, useRef, useState } from "react";
import {
  discoverByAuthor,
  latestVerifiedBinding,
  normalizeCashAddress,
  verify,
  type IdentityBinding,
} from "@bchblaze/identity";
import { useWallet } from "@/components/WalletContext";
import { Button, Card, ErrorBox, Field, TextInput } from "@/components/ui";
import { bip21Uri, parseNostrPubkey } from "@/lib/format";
import { qrDataUrl } from "@/lib/qr";
import { siteConfig } from "@/lib/config";

type PayState =
  | { status: "idle" }
  | { status: "binding_invalid"; message: string }
  | { status: "error"; message: string }
  | { status: "qr_waiting"; address: string; qr: string }
  | { status: "payment_seen"; txid: string; amountSats: number };

function formatBch(amountSats: number): string {
  const bch = (amountSats / 1e8).toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
  return `${bch} BCH`;
}

function isTxidList(value: unknown): value is { txids: string[] } {
  if (!value || typeof value !== "object") return false;
  const txids = (value as { txids?: unknown }).txids;
  return Array.isArray(txids) && txids.every((txid) => typeof txid === "string");
}

function isPayment(value: unknown): value is { txid: string; amountSats: number } {
  if (!value || typeof value !== "object") return false;
  const record = value as { txid?: unknown; amountSats?: unknown };
  return typeof record.txid === "string" && typeof record.amountSats === "number";
}

export default function PayPage() {
  const w = useWallet();
  const [npub, setNpub] = useState("");
  const [amount, setAmount] = useState(siteConfig.defaultAmountBch);
  const [binding, setBinding] = useState<IdentityBinding | null>(null);
  const [pay, setPay] = useState<PayState>({ status: "idle" });
  const [busy, setBusy] = useState(false);
  const baseline = useRef<Set<string> | null>(null);
  const watched = useRef<string | null>(null);

  useEffect(() => {
    if (!binding) return;
    let cancelled = false;
    const record = binding;
    void (async () => {
      try {
        const address = normalizeCashAddress(record.statement.bchAddress, "mainnet");
        const qr = await qrDataUrl(bip21Uri(address, amount));
        if (!cancelled) setPay({ status: "qr_waiting", address, qr });
      } catch (error) {
        if (!cancelled) {
          setPay({ status: "error", message: error instanceof Error ? error.message : String(error) });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [binding, amount]);

  useEffect(() => {
    if (pay.status !== "qr_waiting") return;
    const address = pay.address;
    if (watched.current !== address) {
      watched.current = address;
      baseline.current = null;
    }
    let cancelled = false;

    async function poll(): Promise<void> {
      try {
        const listResponse = await fetch(`/api/payment?address=${encodeURIComponent(address)}`);
        if (!listResponse.ok) return;
        const listBody: unknown = await listResponse.json();
        if (!isTxidList(listBody) || cancelled) return;
        if (baseline.current === null) {
          baseline.current = new Set(listBody.txids);
          return;
        }
        const fresh = listBody.txids.find((txid) => !baseline.current?.has(txid));
        if (fresh === undefined) return;
        const paymentResponse = await fetch(
          `/api/payment?address=${encodeURIComponent(address)}&txid=${fresh}`,
        );
        if (!paymentResponse.ok || cancelled) return;
        const paymentBody: unknown = await paymentResponse.json();
        if (!isPayment(paymentBody) || cancelled) return;
        baseline.current.add(paymentBody.txid);
        setPay({ status: "payment_seen", txid: paymentBody.txid, amountSats: paymentBody.amountSats });
      } catch {
        // Stay on the QR. The next poll retries.
      }
    }

    void poll();
    const timer = window.setInterval(() => void poll(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pay]);

  function applyVerified(record: IdentityBinding): void {
    const checked = verify(record);
    if (!checked.ok || !checked.binding) {
      setBinding(null);
      setPay({
        status: "binding_invalid",
        message: checked.details[0] ?? `Binding did not verify (${checked.status}).`,
      });
      return;
    }
    if (checked.binding.statement.bchNetwork !== "mainnet") {
      setBinding(null);
      setPay({ status: "error", message: "This page pays a mainnet address." });
      return;
    }
    try {
      normalizeCashAddress(checked.binding.statement.bchAddress, "mainnet");
    } catch (error) {
      setBinding(null);
      setPay({ status: "error", message: error instanceof Error ? error.message : String(error) });
      return;
    }
    setPay({ status: "idle" });
    setBinding(checked.binding);
  }

  async function resolve() {
    setBusy(true);
    try {
      const pubkey = parseNostrPubkey(npub);
      const found = await discoverByAuthor(pubkey, { relays: w.relays, timeoutMs: 5000 });
      const best = latestVerifiedBinding(found);
      if (!best) {
        setBinding(null);
        setPay({ status: "error", message: "No verified binding for that npub." });
        return;
      }
      applyVerified(best);
    } catch (e) {
      setPay({ status: "error", message: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  function useLocal() {
    if (!w.binding) {
      setBinding(null);
      setPay({ status: "error", message: "No local binding. Create one on Bind." });
      return;
    }
    applyVerified(w.binding);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1>Pay</h1>
        <p className="lede">
          Resolve an npub to a Bitcoin Cash address only after both signatures check. {w.network}. Nothing is sent
          until you open a wallet.
        </p>
      </div>

      <Card>
        <Field label="npub">
          <TextInput value={npub} placeholder="npub1…" onChange={(e) => setNpub(e.target.value)} />
        </Field>
        <Field label="Amount (BCH)">
          <TextInput value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={() => void resolve()}>
            {busy ? "Resolving…" : "Resolve"}
          </Button>
          <Button type="button" variant="secondary" onClick={useLocal}>
            Local
          </Button>
        </div>
      </Card>

      {pay.status === "qr_waiting" ? (
        <Card>
          <img src={pay.qr} alt="" className="border border-ink bg-paper p-2" width={220} height={220} />
        </Card>
      ) : null}

      {pay.status === "payment_seen" ? (
        <Card>
          <p className="font-mono text-sm">{formatBch(pay.amountSats)}</p>
          <a
            href={`https://blockchair.com/bitcoin-cash/transaction/${pay.txid}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block break-all font-mono text-xs"
          >
            {pay.txid}
          </a>
        </Card>
      ) : null}

      <ErrorBox message={pay.status === "error" || pay.status === "binding_invalid" ? pay.message : null} />
    </div>
  );
}
