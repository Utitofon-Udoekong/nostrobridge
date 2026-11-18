"use client";

import { useEffect, useState } from "react";
import { useWizardConnect, WizardConnectQRDialog } from "@wizardconnect/react";
import {
  encodeCashAddress,
  hash160,
  prefixForNetwork,
} from "@bchblaze/identity";
import { useWallet } from "./WalletContext";
import { Button, ErrorBox } from "./ui";
import { cashaddrFromPubkeyBytes } from "@/lib/format";

export function WizardConnectPanel() {
  const { network, setBchAddress, setBchSource } = useWallet();
  const wc = useWizardConnect({ dappName: "Nostrobridge" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (wc.state !== "connected" || !wc.manager) return;
    try {
      const manager = wc.manager as {
        getPubkey: (a: number, b: bigint) => Uint8Array | string | undefined;
      };
      const pk = manager.getPubkey(0, 0n);
      if (!pk) return;
      const bytes = typeof pk === "string" ? hexToBytes(pk) : pk;
      const addr = cashaddrFromPubkeyBytes(
        bytes,
        (hash) => encodeCashAddress(prefixForNetwork(network), "p2pkh", hash),
        hash160
      );
      setBchAddress(addr);
      setBchSource("wizardconnect");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [wc.state, wc.manager, network, setBchAddress, setBchSource]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => wc.connect()}
          disabled={wc.state === "connecting"}
        >
          {wc.state === "connected" ? "Reconnect" : "WizardConnect"}
        </Button>
        {wc.state === "connected" ? (
          <Button type="button" variant="ghost" onClick={() => void wc.disconnect()}>
            Disconnect
          </Button>
        ) : null}
        <span className="text-xs text-ink/60">{wc.state}</span>
        {wc.walletName ? <span className="text-xs text-ink/60">{wc.walletName}</span> : null}
      </div>
      {wc.uri && wc.qrUri ? (
        <WizardConnectQRDialog
          show={wc.state === "connecting"}
          onClose={() => void wc.disconnect()}
          uri={wc.uri}
          qrUri={wc.qrUri}
          title="WizardConnect"
          subtitle="Scan with Paytaca or Selene"
        />
      ) : null}
      <ErrorBox message={error ?? wc.error} />
    </div>
  );
}

function hexToBytes(hex: string): Uint8Array {
  const h = hex.replace(/^0x/, "");
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
