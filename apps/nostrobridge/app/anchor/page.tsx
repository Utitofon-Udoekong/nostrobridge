"use client";

import { useState } from "react";
import { prepareCashTokenCommitment } from "@bchblaze/identity";
import { planIdentityAnchor } from "@bchblaze/contracts";
import { useWallet } from "@/components/WalletContext";
import { Button, Card, CodeBlock, ErrorBox } from "@/components/ui";

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
        <h1>Anchor</h1>
        <p className="lede">Turn a verified binding into a 32-byte CashTokens commitment. This does not broadcast.</p>
      </div>

      <Card>
        <Button type="button" onClick={prepare}>
          Prepare
        </Button>
        {commitment ? <p className="mt-3 break-all font-mono text-xs text-ink/80">{commitment}</p> : null}
      </Card>

      {planJson ? (
        <Card>
          <CodeBlock value={planJson} />
        </Card>
      ) : null}

      <ErrorBox message={error} />
    </div>
  );
}
