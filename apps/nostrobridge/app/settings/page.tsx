"use client";

import { DEFAULT_RELAYS, type BchNetwork } from "@bchblaze/identity";
import { useWallet } from "@/components/WalletContext";
import { Button, Card, Field, TextArea } from "@/components/ui";

const NETWORKS: BchNetwork[] = ["mainnet", "chipnet", "testnet"];

export default function SettingsPage() {
  const w = useWallet();
  const text = w.relays.join("\n");

  function onNetwork(next: BchNetwork) {
    switch (next) {
      case "mainnet":
      case "chipnet":
      case "testnet":
        w.setNetwork(next);
        return;
      default: {
        const _exhaustive: never = next;
        throw new Error(`Unsupported network: ${_exhaustive}`);
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl leading-tight text-white sm:text-5xl">Relays & network</h1>
        <p className="mt-2 max-w-2xl text-slate-300">
          Discovery talks to these relays. They are untrusted. Change them to match
          your NIP-65 list if you have one.
        </p>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-white">Network</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {NETWORKS.map((n) => (
            <Button
              key={n}
              type="button"
              variant={w.network === n ? "primary" : "secondary"}
              onClick={() => onNetwork(n)}
            >
              {n}
            </Button>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-400">
          Chipnet cashaddrs use the <code>bchtest:</code> prefix. Pay-to-identity
          labels the network on the payment screen so mainnet is never ambiguous.
        </p>
      </Card>

      <Card>
        <Field label="Relay URLs (one per line)">
          <TextArea
            rows={8}
            value={text}
            onChange={(e) =>
              w.setRelays(
                e.target.value
                  .split("\n")
                  .map((l) => l.trim())
                  .filter((l) => l.startsWith("wss://"))
              )
            }
          />
        </Field>
        <Button
          className="mt-3"
          type="button"
          variant="secondary"
          onClick={() => w.setRelays([...DEFAULT_RELAYS])}
        >
          Reset to defaults
        </Button>
      </Card>
    </div>
  );
}
