"use client";

import { useMemo, useState } from "react";
import {
  assembleIdentityBinding,
  createBindingDraft,
  createUnsignedBindingEvent,
  exportIdentityBinding,
  publishBinding,
  BINDING_KIND,
  verify,
  verifyBchMessage,
  type BindingDraft,
  type IdentityBinding,
  type NostrEvent,
} from "@bchblaze/identity";
import { ConnectPanel } from "@/components/ConnectPanel";
import { useWallet } from "@/components/WalletContext";
import { Button, Card, CodeBlock, ErrorBox, Field, Pill, TextArea } from "@/components/ui";
import { signPaytacaMessage } from "@/lib/bch-wallet";
import { parseSignedEventJson, signWithNip07 } from "@/lib/nostr";
import { copyText } from "@/lib/format";

export default function LinkPage() {
  const w = useWallet();
  const [draft, setDraft] = useState<BindingDraft | null>(null);
  const [bchSig, setBchSig] = useState("");
  const [eventJson, setEventJson] = useState("");
  const [binding, setLocalBinding] = useState<IdentityBinding | null>(w.binding);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [publishLog, setPublishLog] = useState<string>("");

  const ready = Boolean(w.bchAddress && w.nostrPubkey);

  function generate() {
    setError(null);
    try {
      const next = createBindingDraft({
        bchAddress: w.bchAddress,
        bchNetwork: w.network,
        nostrPubkey: w.nostrPubkey,
      });
      setDraft(next);
      setBchSig("");
      setEventJson("");
      setLocalBinding(null);
      setStatus("Canonical statement ready. Sign it with both keys.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function signBch() {
    if (!draft) return;
    setError(null);
    try {
      const sig = await signPaytacaMessage(draft.bchMessage);
      setBchSig(sig);
      setStatus("BCH signature captured from Paytaca.");
    } catch (e) {
      setError(
        `${e instanceof Error ? e.message : String(e)} — paste an Electron Cash signature below if Paytaca is unavailable.`
      );
    }
  }

  function checkBchPaste(sig: string) {
    if (!draft) return;
    const result = verifyBchMessage(draft.bchMessage, draft.statement.bchAddress, sig.trim());
    if (!result.valid) {
      setError(result.error ?? "BCH signature invalid");
      return;
    }
    setBchSig(sig.trim());
    setError(null);
    setStatus("BCH signature valid for this address and statement.");
  }

  async function signNostr() {
    if (!draft || !bchSig) return;
    setError(null);
    try {
      const unsigned = createUnsignedBindingEvent(draft.statement, bchSig);
      const signed = await signWithNip07(unsigned);
      setEventJson(JSON.stringify(signed, null, 2));
      finish(draft, bchSig, signed);
    } catch (e) {
      setError(
        `${e instanceof Error ? e.message : String(e)} — paste a signed kind-${BINDING_KIND} event JSON if you have no NIP-07 extension.`
      );
    }
  }

  function finish(d: BindingDraft, sig: string, event: NostrEvent) {
    const assembled = assembleIdentityBinding(d.statement, sig, event);
    const result = verify(assembled);
    if (!result.ok) {
      setError(`Local verify failed (${result.status}): ${result.details.join("; ")}`);
      return;
    }
    setLocalBinding(assembled);
    w.setBinding(assembled);
    setStatus("Both proofs valid. Binding is stored locally (public record only).");
  }

  function applyPastedEvent() {
    if (!draft || !bchSig) return;
    setError(null);
    try {
      const event = parseSignedEventJson(eventJson);
      finish(draft, bchSig, event);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function publish() {
    if (!binding) return;
    setError(null);
    setPublishLog("Publishing…");
    try {
      const results = await publishBinding(binding.event, w.relays);
      setPublishLog(
        results.map((r) => `${r.ok ? "ok" : "fail"}  ${r.relay}${r.error ? ` — ${r.error}` : ""}`).join("\n")
      );
      setStatus("Publish attempted. Relays are untrusted; re-verify from /verify.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const unsignedPreview = useMemo(() => {
    if (!draft || !bchSig) return "";
    return JSON.stringify(createUnsignedBindingEvent(draft.statement, bchSig), null, 2);
  }, [draft, bchSig]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl leading-tight text-white sm:text-5xl">Create a binding</h1>
        <p className="mt-2 max-w-2xl text-slate-300">
          Private keys never touch this page. Paytaca / Electron Cash signs the BCH
          message. NIP-07 signs the Nostr event. Network:{" "}
          <Pill>{w.network}</Pill>
        </p>
      </div>

      <ConnectPanel />

      <Card>
        <h2 className="text-lg font-semibold text-white">Generate canonical statement</h2>
        <p className="mt-1 text-sm text-slate-400">
          Binding ID is SHA-256 of the sorted JSON fields. Both keys will sign the
          exact domain-separated message below.
        </p>
        <Button className="mt-4" type="button" disabled={!ready} onClick={generate}>
          Generate statement + Binding ID
        </Button>
        {draft ? (
          <div className="mt-4 space-y-3">
            <p className="font-mono text-xs text-bch-400">
              bindingId {draft.statement.bindingId}
            </p>
            <Field label="Exact BCH signmessage text (Electron Cash: Tools → Sign/verify message)">
              <CodeBlock value={draft.bchMessage} />
            </Field>
          </div>
        ) : null}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-white">Sign with BCH</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" disabled={!draft} onClick={() => void signBch()}>
            Sign with Paytaca
          </Button>
        </div>
        <Field
          label="Or paste the base64 signature"
          hint="Must verify against the connected cashaddr and the exact message."
        >
          <TextArea
            rows={3}
            value={bchSig}
            onChange={(e) => setBchSig(e.target.value)}
            placeholder="H1….="
          />
        </Field>
        <Button
          className="mt-2"
          type="button"
          variant="secondary"
          disabled={!draft || !bchSig}
          onClick={() => checkBchPaste(bchSig)}
        >
          Check pasted BCH signature
        </Button>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-white">Sign with Nostr</h2>
        {unsignedPreview ? (
          <Field label={`Unsigned event template (kind ${BINDING_KIND})`}>
            <CodeBlock value={unsignedPreview} />
          </Field>
        ) : (
          <p className="text-sm text-slate-400">BCH signature required first so the i-tag can carry it.</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" disabled={!draft || !bchSig} onClick={() => void signNostr()}>
            Sign with NIP-07
          </Button>
        </div>
        <Field label="Or paste the signed event JSON">
          <TextArea
            rows={8}
            value={eventJson}
            onChange={(e) => setEventJson(e.target.value)}
          />
        </Field>
        <Button
          className="mt-2"
          type="button"
          variant="secondary"
          disabled={!draft || !bchSig || !eventJson}
          onClick={applyPastedEvent}
        >
          Assemble from pasted event
        </Button>
      </Card>

      {binding ? (
        <Card>
          <h2 className="text-lg font-semibold text-white">Verified locally</h2>
          <p className="mt-1 text-sm text-slate-300">
            This site is not an authority. The record below is what you export or publish.
          </p>
          <CodeBlock value={exportIdentityBinding(binding)} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void publish()}>
              Publish to relays
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void copyText(exportIdentityBinding(binding))}
            >
              Copy JSON
            </Button>
          </div>
          {publishLog ? <pre className="mt-3 text-xs text-slate-300">{publishLog}</pre> : null}
        </Card>
      ) : null}

      <ErrorBox message={error} />
      {status ? <p className="text-sm text-bch-400">{status}</p> : null}
    </div>
  );
}
