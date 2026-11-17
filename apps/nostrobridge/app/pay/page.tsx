"use client";

import { useState } from "react";
import {
  discoverByAuthor,
  latestVerifiedBinding,
  verify,
  type IdentityBinding,
} from "@bchblaze/identity";
import { useWallet } from "@/components/WalletContext";
import { Button, Card, ErrorBox, Field, Pill, TextInput } from "@/components/ui";
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
      setNote(
        `Binding is on ${checked.binding.statement.bchNetwork}; this UI is set to ${w.network}. Switch network in Relays if this is intentional.`
      );
    } else {
      setNote(`${source}. BIP21 below is a real ${checked.binding.statement.bchNetwork} payment request — send only what you intend.`);
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
        <h1 className="text-4xl leading-tight text-white sm:text-5xl">Pay a Nostr identity</h1>
        <p className="mt-2 max-w-2xl text-slate-300">
          Resolve an npub to a BCH address only after both signatures verify. Then
          this page prepares a small real {w.network} BIP21 transaction. Nothing is
          auto-sent.
        </p>
        <Pill tone={w.network === "mainnet" ? "ok" : "warn"}>{w.network}</Pill>
      </div>

      <Card>
        <Field label="Recipient npub">
          <TextInput value={npub} placeholder="npub1…" onChange={(e) => setNpub(e.target.value)} />
        </Field>
        <Field label="Amount (BCH)" hint="Default is a few cents. Change it before scanning.">
          <TextInput value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={() => void resolve()}>
            {busy ? "Resolving…" : "Resolve & verify"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void useLocal()}>
            Use locally stored binding
          </Button>
          <Button type="button" variant="secondary" disabled={!binding} onClick={() => void refreshQr()}>
            Refresh QR
          </Button>
        </div>
      </Card>

      {binding ? (
        <Card>
          <h2 className="text-lg font-semibold text-white">Verified payment target</h2>
          <p className="mt-1 font-mono text-xs text-nostr-400">{toNpub(binding.statement.nostrPubkey)}</p>
          <p className="mt-2 break-all font-mono text-sm text-bch-400">{binding.statement.bchAddress}</p>
          <p className="mt-3 break-all font-mono text-xs text-slate-300">{uri}</p>
          {qr ? (
            <img src={qr} alt="BIP21 payment QR" className="mt-4 rounded-lg bg-white p-2" width={220} height={220} />
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              className="rounded-full bg-bch-500 px-4 py-2 text-sm font-medium text-ink-950 no-underline hover:bg-bch-400"
              href={uri}
            >
              Open in wallet (BIP21)
            </a>
            <a
              href={explorerAddressUrl(binding.statement.bchAddress, binding.statement.bchNetwork)}
              target="_blank"
              rel="noreferrer"
            >
              Explorer
            </a>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            The prepared transaction is the BIP21 URI + QR. Open it in Paytaca, Electron
            Cash, or any cashaddr wallet. WizardConnect can later sign a constructed
            raw transaction, but this demo never auto-broadcasts. Throwaway sample
            addresses are not payment targets.
          </p>
          <details className="mt-3 text-xs text-slate-400">
            <summary className="cursor-pointer text-slate-200">Adversarial notes</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Unverified npub → no URI (this page refuses to guess an address).</li>
              <li>Tampered JSON that fails verify() → no URI.</li>
              <li>Network mismatch is labeled; chipnet vs mainnet is never implicit.</li>
            </ul>
          </details>
        </Card>
      ) : null}

      <ErrorBox message={error} />
      {note ? <p className="text-sm text-amber-200">{note}</p> : null}
    </div>
  );
}
