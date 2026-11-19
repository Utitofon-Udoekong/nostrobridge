"use client";

import { useEffect, useRef, useState } from "react";
import { childIndexOfPathName } from "@wizardconnect/core";
import { useWizardConnect, WizardConnectQRDialog } from "@wizardconnect/react";
import {
  encodeCashAddress,
  hash160,
  prefixForNetwork,
} from "@bchblaze/identity";
import { useWallet } from "./WalletContext";
import { Button, ErrorBox } from "./ui";
import { cashaddrFromPubkeyBytes } from "@/lib/format";

type LinkState = "idle" | "connecting" | "connected" | "reconnecting" | "disconnected";

function buttonLabel(state: LinkState): string {
  switch (state) {
    case "connecting":
    case "reconnecting":
      return "Connecting";
    case "connected":
      return "Reconnect";
    case "idle":
    case "disconnected":
      return "Connect";
    default: {
      const unexpected: never = state;
      return unexpected;
    }
  }
}

export function WizardConnectPanel() {
  const { network, setBchAddress, setBchSource } = useWallet();
  const wc = useWizardConnect({
    dappName: "Nostrobridge",
    sessionKey: "nostrobridge-wizardconnect",
    persistSession: false,
  });
  const [error, setError] = useState<string | null>(null);
  const restart = useRef(false);

  useEffect(() => {
    if (!restart.current) return;
    if (wc.state !== "idle" && wc.state !== "disconnected") return;
    restart.current = false;
    wc.connect();
  }, [wc.state, wc.connect]);

  useEffect(() => {
    if (wc.state !== "connected" || !wc.manager) return;
    try {
      const manager = wc.manager as {
        getPubkey: (account: number, index: bigint) => Uint8Array | string | undefined;
        getSessionPaths: () => { name: string }[];
      };
      const receive = manager.getSessionPaths().find((path) => path.name === "receive");
      const child = receive ? childIndexOfPathName(receive.name) : 0;
      const pk = manager.getPubkey(child ?? 0, 0n);
      if (!pk) {
        setError("The wallet connected without a receive address.");
        return;
      }
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

  function openWallet() {
    if (wc.state === "idle" || wc.state === "disconnected") {
      wc.connect();
      return;
    }
    restart.current = true;
    void wc.disconnect();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" onClick={openWallet}>
          {buttonLabel(wc.state)}
        </Button>
        {wc.state === "connected" ? (
          <Button type="button" variant="ghost" onClick={() => void wc.disconnect()}>
            Disconnect
          </Button>
        ) : null}
        {wc.walletName ? <span className="text-xs text-ink/60">{wc.walletName}</span> : null}
      </div>
      {wc.uri && wc.qrUri ? (
        <WizardConnectQRDialog
          show={wc.state === "connecting" || wc.state === "reconnecting"}
          onClose={() => void wc.disconnect()}
          uri={wc.uri}
          qrUri={wc.qrUri}
          title="Connect"
          subtitle="Scan with a wallet"
          theme={{
            backdropColor: "rgba(14, 20, 16, 0.45)",
            dialogBackground: "#f4efe4",
            headerBackground: "#f4efe4",
            titleColor: "#0e6b45",
            subtitleColor: "#0e6b45",
            qrForeground: "#0e6b45",
            qrBackground: "#f4efe4",
            uriRowBackground: "#f4efe4",
            uriTextColor: "#0e6b45",
            borderColor: "#0e6b45",
            closeButtonColor: "#0e6b45",
            copyButtonColor: "#0e6b45",
          }}
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
