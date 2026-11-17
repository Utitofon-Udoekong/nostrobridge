"use client";

import { useState } from "react";
import { exportIdentityBinding, prepareCashTokenCommitment } from "@bchblaze/identity";
import { planIdentityAnchor, IDENTITY_ANCHOR_SOURCE } from "@bchblaze/contracts";
import { useWallet } from "@/components/WalletContext";
import { Button, Card, CodeBlock, ErrorBox, Pill } from "@/components/ui";

export default function AnchorPage() {
  const w = useWallet();
  const [error, setError] = useState<string | null>(null);
  const [planJson, setPlanJson] = useState<string>("");
  const [commitment, setCommitment] = useState<string>("");

  function prepare() {
    setError(null);
    if (!w.binding) {
      setError("No local binding. Create one on /link, or verify an npub and store it.");
      return;
    }
    try {
      const token = prepareCashTokenCommitment(w.binding);
      const plan = planIdentityAnchor(w.binding);
      setCommitment(token.hex);
      const { commitmentBytes: _commitmentBytes, ...rest } = plan;
      setPlanJson(
        JSON.stringify(
          {
            ...rest,
            bindingJsonHint: "IdentityBinding is stored locally; not duplicated here.",
          },
          null,
          2
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl leading-tight text-white sm:text-5xl">CashTokens anchor</h1>
        <p className="mt-2 max-w-2xl text-slate-300">
          Optional stretch path: pin the verified binding as a 32-byte CashTokens NFT
          commitment. A SolidCash <code>IdentityAnchor</code> skeleton in{" "}
          <code>packages/contracts</code> stores that hash in contract state.
        </p>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-white">Prepare commitment</h2>
        <p className="mt-1 text-sm text-slate-400">
          Runs <code>verify()</code> first. Unverified bindings cannot be committed.
          This button does not broadcast a transaction; it produces the exact bytes a
          genesis NFT would carry.
        </p>
        <Button className="mt-4" type="button" onClick={prepare}>
          Prepare on-chain anchor
        </Button>
        {commitment ? (
          <div className="mt-4 space-y-2">
            <Pill tone="ok">32-byte commitment</Pill>
            <p className="break-all font-mono text-sm text-bch-400">{commitment}</p>
          </div>
        ) : null}
      </Card>

      {planJson ? (
        <Card>
          <h2 className="text-lg font-semibold text-white">SolidCash constructor args</h2>
          <CodeBlock value={planJson} />
        </Card>
      ) : null}

      <Card>
        <h2 className="text-lg font-semibold text-white">IdentityAnchor.scash</h2>
        <CodeBlock value={IDENTITY_ANCHOR_SOURCE} />
      </Card>

      {w.binding ? (
        <Card>
          <h2 className="text-lg font-semibold text-white">Bound record used</h2>
          <CodeBlock value={exportIdentityBinding(w.binding)} />
        </Card>
      ) : null}

      <ErrorBox message={error} />
    </div>
  );
}
