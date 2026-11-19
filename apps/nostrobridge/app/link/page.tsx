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
import { Button, Card, CodeBlock, ErrorBox, Field, TextArea } from "@/components/ui";
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
        <h1>Bind</h1>
        <p className="lede">
          Sign one statement with a Bitcoin Cash wallet and a Nostr key. This page is on {w.network}.
        </p>
      </div>

      <ConnectPanel />

      <Card>
        <h2>Statement</h2>
        <Button className="mt-3" type="button" disabled={!ready} onClick={generate}>
          Generate
        </Button>
        {draft ? (
          <div className="mt-4 space-y-3">
            <p className="break-all font-mono text-xs text-ink/70">{draft.statement.bindingId}</p>
            <Field label="Message to sign">
              <CodeBlock value={draft.bchMessage} />
            </Field>
          </div>
        ) : null}
      </Card>

      <Card>
        <h2>Bitcoin Cash</h2>
        <Field label="Signature">
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
          Check signature
        </Button>
      </Card>

      <Card>
        <h2>Nostr</h2>
        {unsignedPreview ? (
          <Field label={`Unsigned event · ${BINDING_KIND}`}>
            <CodeBlock value={unsignedPreview} />
          </Field>
        ) : (
          <p className="text-sm text-ink/60">Sign Bitcoin Cash first.</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" disabled={!draft || !bchSig} onClick={() => void signNostr()}>
            Sign with NIP-07
          </Button>
        </div>
        <Field label="Signed event">
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
          Use pasted event
        </Button>
      </Card>

      {binding ? (
        <Card>
          <h2>Record</h2>
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
      {status ? <p className="text-sm text-ink/70">{status}</p> : null}
    </div>
  );
}
