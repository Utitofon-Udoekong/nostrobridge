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
        <h1>Relays</h1>
        <p className="lede">Where to look a binding up. Changing them does not change how a signature is checked.</p>
      </div>

      <Card>
        <h2>Network</h2>
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
      </Card>

      <Card>
        <Field label="Relays">
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
