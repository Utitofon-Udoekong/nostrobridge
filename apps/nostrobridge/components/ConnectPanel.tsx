"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { normalizeCashAddress } from "@bchblaze/identity";
import { connectPaytaca } from "@/lib/bch-wallet";
import { connectNip07 } from "@/lib/nostr";
import { parseNostrPubkey, shortHex, toNpub } from "@/lib/format";
import { siteConfig } from "@/lib/config";
import { ErrorBoundary } from "./ErrorBoundary";
import { useWallet } from "./WalletContext";
import { Button, Card, ErrorBox, Field, Pill, TextInput } from "./ui";

const WizardConnectPanel = dynamic(
  () => import("./WizardConnectPanel").then((m) => m.WizardConnectPanel),
  { ssr: false, loading: () => <p className="text-sm text-slate-400">Loading WizardConnect…</p> }
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
      <Card accent="bch">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-bch-400">Bitcoin Cash</p>
        <h2 className="mt-1 text-lg font-medium text-white">Spending identity</h2>
        <p className="mt-1 text-sm text-slate-400">
          Paytaca signs the statement in-wallet. WizardConnect fills the address from
          xpubs. Electron Cash works as a paste-signature fallback.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={() => void onPaytaca()}>
            Connect Paytaca
          </Button>
          {w.paytacaDetected === true ? <Pill tone="ok">Detected</Pill> : null}
          {w.paytacaDetected === false ? (
            <a
              href={siteConfig.paytacaInstallUrl}
              target="_blank"
              rel="noreferrer"
              className="self-center text-sm text-bch-400 underline decoration-bch-500/40 underline-offset-4"
            >
              Install Paytaca
            </a>
          ) : null}
        </div>
        <div className="mt-4">
          <ErrorBoundary
            fallback={
              <p className="text-sm text-amber-200">
                WizardConnect failed to load in this browser. Use Paytaca or paste a
                cashaddr instead.
              </p>
            }
          >
            <WizardConnectPanel />
          </ErrorBoundary>
        </div>
        <div className="mt-4 space-y-2">
          <Field label="Or paste a cashaddr" hint="P2PKH q… or token-aware z…">
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
            Use this address
          </Button>
        </div>
        {w.bchAddress ? (
          <p className="mt-3 break-all font-mono text-xs text-bch-400">
            {w.bchAddress} <Pill>{w.bchSource ?? "unknown"}</Pill>
          </p>
        ) : null}
      </Card>

      <Card accent="nostr">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-nostr-400">Nostr</p>
        <h2 className="mt-1 text-lg font-medium text-white">Social identity</h2>
        <p className="mt-1 text-sm text-slate-400">
          NIP-07 (nos2x, Alby) signs the binding event. Without an extension, paste an
          npub and later paste the signed event JSON.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => void onNip07()}>
            Connect NIP-07
          </Button>
          <Pill tone={w.nip07Detected ? "ok" : "warn"}>
            {w.nip07Detected ? "Extension detected" : "No extension — paste fallback"}
          </Pill>
        </div>
        <div className="mt-4 space-y-2">
          <Field label="Or paste npub / hex pubkey">
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
            Use this pubkey
          </Button>
        </div>
        {w.nostrPubkey ? (
          <p className="mt-3 break-all font-mono text-xs text-nostr-400">
            {toNpub(w.nostrPubkey)}
            <br />
            {shortHex(w.nostrPubkey, 12)} <Pill>{w.nostrSource ?? "unknown"}</Pill>
          </p>
        ) : null}
      </Card>
      <div className="lg:col-span-2">
        <ErrorBox message={error} />
      </div>
    </div>
  );
}
