"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { normalizeCashAddress } from "@bchblaze/identity";
import { connectPaytaca } from "@/lib/bch-wallet";
import { connectNip07 } from "@/lib/nostr";
import { parseNostrPubkey, toNpub } from "@/lib/format";
import { siteConfig } from "@/lib/config";
import { ErrorBoundary } from "./ErrorBoundary";
import { useWallet } from "./WalletContext";
import { Button, Card, ErrorBox, Field, TextInput } from "./ui";

const WizardConnectPanel = dynamic(
  () => import("./WizardConnectPanel").then((m) => m.WizardConnectPanel),
  { ssr: false, loading: () => <p className="text-sm text-ink/60">Loading</p> }
);

export function ConnectPanel() {
  const w = useWallet();
  const [bchPaste, setBchPaste] = useState("");
  const [npubPaste, setNpubPaste] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onPaytaca() {
    setError(null);
    try {
      const addr = await connectPaytaca();
      w.setBchAddress(addr);
      w.setBchSource("paytaca");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function onNip07() {
    setError(null);
    try {
      const pk = await connectNip07();
      w.setNostrPubkey(pk);
      w.setNostrSource("nip07");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <h2>Bitcoin Cash</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" onClick={() => void onPaytaca()}>
            Paytaca
          </Button>
          {w.paytacaDetected === false ? (
            <a
              href={siteConfig.paytacaInstallUrl}
              target="_blank"
              rel="noreferrer"
              className="self-center text-sm"
            >
              Install Paytaca
            </a>
          ) : null}
        </div>
        <div className="mt-4">
          <ErrorBoundary
            fallback={
              <p className="text-sm">WizardConnect failed to load.</p>
            }
          >
            <WizardConnectPanel />
          </ErrorBoundary>
        </div>
        <div className="mt-4 space-y-2">
          <Field label="Cashaddr">
            <TextInput
              value={bchPaste}
              placeholder="bitcoincash:q…"
              onChange={(e) => setBchPaste(e.target.value)}
            />
          </Field>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setError(null);
              try {
                w.setBchAddress(normalizeCashAddress(bchPaste.trim(), w.network));
                w.setBchSource("paste");
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              }
            }}
          >
            Use address
          </Button>
        </div>
        {w.bchAddress ? (
          <p className="mt-3 break-all font-mono text-xs text-ink/70">
            {w.bchAddress}
            {w.bchSource ? ` · ${w.bchSource}` : ""}
          </p>
        ) : null}
      </Card>

      <Card>
        <h2>Nostr</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => void onNip07()}>
            NIP-07
          </Button>
          <span className="text-xs text-ink/60">{w.nip07Detected ? "Extension" : "Paste"}</span>
        </div>
        <div className="mt-4 space-y-2">
          <Field label="npub">
            <TextInput
              value={npubPaste}
              placeholder="npub1…"
              onChange={(e) => setNpubPaste(e.target.value)}
            />
          </Field>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setError(null);
              try {
                w.setNostrPubkey(parseNostrPubkey(npubPaste));
                w.setNostrSource("paste");
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              }
            }}
          >
            Use pubkey
          </Button>
        </div>
        {w.nostrPubkey ? (
          <p className="mt-3 break-all font-mono text-xs text-ink/70">
            {toNpub(w.nostrPubkey)}
            {w.nostrSource ? ` · ${w.nostrSource}` : ""}
          </p>
        ) : null}
      </Card>
      <div className="lg:col-span-2">
        <ErrorBox message={error} />
      </div>
    </div>
  );
}
