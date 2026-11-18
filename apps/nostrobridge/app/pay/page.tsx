"use client";

import { useState } from "react";
import {
  discoverByAuthor,
  latestVerifiedBinding,
  verify,
  type IdentityBinding,
} from "@bchblaze/identity";
import { useWallet } from "@/components/WalletContext";
import { Button, Card, ErrorBox, Field, TextInput } from "@/components/ui";
import { bip21Uri, explorerAddressUrl, parseNostrPubkey, toNpub } from "@/lib/format";
import { qrDataUrl } from "@/lib/qr";
import { siteConfig } from "@/lib/config";

export default function PayPage() {
  const w = useWallet();
  const [npub, setNpub] = useState("");
  const [amount, setAmount] = useState(siteConfig.defaultAmountBch);
  const [binding, setBinding] = useState<IdentityBinding | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const uri = binding ? bip21Uri(binding.statement.bchAddress, amount) : "";

  async function applyVerified(record: IdentityBinding, source: string) {
    const checked = verify(record);
    if (!checked.ok || !checked.binding) {
      setBinding(null);
      setError(`Binding did not verify (${checked.status}). Refusing to pay.`);
      return;
    }
    if (checked.binding.statement.bchNetwork !== w.network) {
      setNote(`${checked.binding.statement.bchNetwork}, this page is ${w.network}.`);
    } else {
      setNote(source);
    }
    setBinding(checked.binding);
    setQr(await qrDataUrl(bip21Uri(checked.binding.statement.bchAddress, amount)));
  }

  async function resolve() {
    setError(null);
    setNote(null);
    setQr(null);
    setBusy(true);
    try {
      const pubkey = parseNostrPubkey(npub);
      const found = await discoverByAuthor(pubkey, { relays: w.relays, timeoutMs: 5000 });
      const best = latestVerifiedBinding(found);
      if (!best) {
        setBinding(null);
        setError("No verified binding for that npub. Refusing to pay an unverified address.");
        return;
      }
      await applyVerified(best, "Resolved from relays, then re-verified locally");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function useLocal() {
    setError(null);
    setNote(null);
    setQr(null);
    if (!w.binding) {
      setError("No local binding. Create one on /link or load the sample on /verify.");
      return;
    }
    await applyVerified(w.binding, "Used locally stored binding after verify()");
  }

  async function refreshQr() {
    if (!binding) return;
    setQr(await qrDataUrl(bip21Uri(binding.statement.bchAddress, amount)));
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
          <Button type="button" variant="secondary" onClick={() => void useLocal()}>
            Local
          </Button>
          <Button type="button" variant="secondary" disabled={!binding} onClick={() => void refreshQr()}>
            Refresh QR
          </Button>
        </div>
      </Card>

      {binding ? (
        <Card>
          <h2>Recipient</h2>
          <p className="mt-2 break-all font-mono text-xs text-ink/70">{toNpub(binding.statement.nostrPubkey)}</p>
          <p className="mt-2 break-all font-mono text-sm">{binding.statement.bchAddress}</p>
          <p className="mt-3 break-all font-mono text-xs text-ink/70">{uri}</p>
          {qr ? (
            <img src={qr} alt="BIP21 payment QR" className="mt-4 border border-ink bg-paper p-2" width={220} height={220} />
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              className="bg-ink px-3 py-1.5 text-sm text-paper no-underline hover:opacity-80"
              href={uri}
            >
              Open wallet
            </a>
            <a
              href={explorerAddressUrl(binding.statement.bchAddress, binding.statement.bchNetwork)}
              target="_blank"
              rel="noreferrer"
            >
              Explorer
            </a>
          </div>
        </Card>
      ) : null}

      <ErrorBox message={error} />
      {note ? <p className="text-sm text-ink/70">{note}</p> : null}
    </div>
  );
}
