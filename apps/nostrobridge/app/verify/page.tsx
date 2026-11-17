"use client";

import { useState } from "react";
import {
  BINDING_KIND,
  discoverByAuthor,
  exportIdentityBinding,
  importIdentityBinding,
  latestVerifiedBinding,
  verify,
  type IdentityBinding,
  type VerificationResult,
} from "@bchblaze/identity";
import { useWallet } from "@/components/WalletContext";
import { Button, Card, CodeBlock, ErrorBox, Field, Pill, TextArea, TextInput } from "@/components/ui";
import { parseNostrPubkey } from "@/lib/format";

function tamperBindingId(record: IdentityBinding): IdentityBinding {
  const clone = structuredClone(record);
  const flipped = clone.statement.bindingId.startsWith("a") ? "b" : "a";
  clone.statement.bindingId = flipped + clone.statement.bindingId.slice(1);
  return clone;
}

function tamperAddress(record: IdentityBinding): IdentityBinding {
  const clone = structuredClone(record);
  clone.statement.bchAddress = clone.statement.bchAddress.replace(/q/, "p");
  return clone;
}

export default function VerifyPage() {
  const w = useWallet();
  const [npub, setNpub] = useState("");
  const [json, setJson] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [source, setSource] = useState<IdentityBinding | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function show(r: VerificationResult, remember = false) {
    setResult(r);
    if (r.binding && (remember || r.ok)) {
      setSource(r.binding);
      setJson(exportIdentityBinding(r.binding));
    }
  }

  async function lookup() {
    setError(null);
    setBusy(true);
    try {
      const pubkey = parseNostrPubkey(npub);
      const found = await discoverByAuthor(pubkey, { relays: w.relays, timeoutMs: 5000 });
      const best = latestVerifiedBinding(found);
      if (best) {
        show(verify(best), true);
      } else if (found[0]) {
        show(found[0], found[0].ok);
      } else {
        setResult(null);
        setError(`No kind-${BINDING_KIND} binding found on the configured relays.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function verifyJson() {
    setError(null);
    try {
      show(verify(json));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function loadLocal() {
    if (!w.binding) {
      setError("No local binding. Create one on /link or load the throwaway sample.");
      return;
    }
    setJson(exportIdentityBinding(w.binding));
    show(verify(w.binding), true);
  }

  async function loadSample() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/sample-binding.json");
      if (!res.ok) throw new Error("Could not load sample-binding.json");
      const text = await res.text();
      const record = importIdentityBinding(text);
      const checked = verify(record);
      w.setBinding(record);
      setJson(exportIdentityBinding(record));
      show(checked, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl leading-tight text-white sm:text-5xl">Independent verifier</h1>
        <p className="mt-2 max-w-2xl text-slate-300">
          This page only calls <code className="text-bch-400">verify()</code> from
          @bchblaze/identity in your browser. It never asks a backend whether a
          binding is valid. Relays are queried for discovery, then discarded.
        </p>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-white">Lookup by npub</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <TextInput
            value={npub}
            placeholder="npub1… or hex"
            onChange={(e) => setNpub(e.target.value)}
          />
          <Button type="button" disabled={busy} onClick={() => void lookup()}>
            Discover & verify
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={loadLocal}>
            Use binding stored in this browser
          </Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void loadSample()}>
            Load throwaway sample binding
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          The sample is a dual-signed fixture in this repo. Do not send BCH to its
          address. It exists so judges can run verify + tamper without a wallet.
        </p>
      </Card>

      <Card>
        <Field label="Or paste IdentityBinding JSON / Nostr event JSON">
          <TextArea rows={12} value={json} onChange={(e) => setJson(e.target.value)} />
        </Field>
        <Button className="mt-3" type="button" onClick={verifyJson}>
          Verify JSON offline
        </Button>
      </Card>

      {result ? (
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-white">Result</h2>
            <Pill tone={result.ok ? "ok" : "bad"}>{result.status}</Pill>
          </div>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
            {result.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-400">
            Nostr sig {result.nostrValid ? "valid" : "invalid"} · BCH sig{" "}
            {result.bchValid ? "valid" : "invalid"}
          </p>
          {result.binding ? (
            <div className="mt-4">
              <CodeBlock value={exportIdentityBinding(result.binding)} />
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <h2 className="text-lg font-semibold text-white">Adversarial checks</h2>
        <p className="mt-1 text-sm text-slate-400">
          Judges: load a valid binding, then press a tamper button. The same
          verify() function must fail closed. No private keys are involved.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="danger"
            disabled={!source}
            onClick={() => {
              if (!source) return;
              show(verify(tamperBindingId(source)));
            }}
          >
            Tamper bindingId
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={!source}
            onClick={() => {
              if (!source) return;
              show(verify(tamperAddress(source)));
            }}
          >
            Tamper cashaddr
          </Button>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-slate-300">
          <li>Wrong bindingId → SHA-256 mismatch (malformed / invalid_binding_id).</li>
          <li>Swapped address without both new signatures → fail.</li>
          <li>Kind 30078 (NIP-78) and kind 31234 (NIP-37 drafts) are rejected. Only kind {BINDING_KIND} verifies.</li>
          <li>Expired expiresAt → expired. Future createdAt beyond skew → timestamp_invalid.</li>
        </ul>
      </Card>

      <ErrorBox message={error} />
    </div>
  );
}
