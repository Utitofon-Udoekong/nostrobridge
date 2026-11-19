"use client";

import { useEffect, useMemo, useState } from "react";
import {
  InMemoryReplayStore,
  buildAuthSigningMessage,
  createChallenge,
  createUnsignedAuthEvent,
  verifyAuthResponse,
  verifyBchMessage,
  type AuthChallenge,
  type AuthResult,
} from "@bchblaze/identity";
import { useWallet } from "@/components/WalletContext";
import { Button, Card, CodeBlock, ErrorBox, Field, Pill, TextArea, TextInput } from "@/components/ui";
import { parseSignedEventJson, signWithNip07 } from "@/lib/nostr";
export default function AuthenticatePage() {
  const w = useWallet();
  const store = useMemo(() => new InMemoryReplayStore(), []);

  useEffect(() => {
    setAudience(window.location.origin);
  }, []);
  const [audience, setAudience] = useState("https://nostrobridge.local");
  const [challenge, setChallenge] = useState<AuthChallenge | null>(null);
  const [eventJson, setEventJson] = useState("");
  const [bchSig, setBchSig] = useState("");
  const [result, setResult] = useState<AuthResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function issue() {
    setError(null);
    setResult(null);
    if (!w.binding) {
      setError("Create or load a verified binding on Bind first.");
      return;
    }
    const next = createChallenge({
      audience,
      action: "authenticate",
      bindingId: w.binding.statement.bindingId,
      ttlSeconds: 120,
    });
    setChallenge(next);
    setEventJson("");
    setBchSig("");
  }

  async function signNostr() {
    if (!challenge || !w.binding) return;
    setError(null);
    try {
      const unsigned = createUnsignedAuthEvent(challenge, w.binding.statement.nostrPubkey);
      const signed = await signWithNip07(unsigned);
      setEventJson(JSON.stringify(signed, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function check(replay = false) {
    if (!challenge || !w.binding) return;
    setError(null);
    try {
      const event = parseSignedEventJson(eventJson);
      const auth = await verifyAuthResponse(
        challenge,
        {
          challengeId: challenge.challengeId,
          event,
          bchSignature: bchSig.trim() || undefined,
        },
        w.binding,
        {
          replayStore: store,
          expectedAudience: audience,
        }
      );
      setResult(auth);
      if (replay && auth.status !== "replay_detected") {
        setError("Replay did not trigger replay_detected — unexpected.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1>Authenticate</h1>
        <p className="lede">A published binding is not a session. Issue a challenge for this site and sign it once.</p>
      </div>

      <Card>
        <Field label="Audience (origin)">
          <TextInput value={audience} onChange={(e) => setAudience(e.target.value)} />
        </Field>
        <Button className="mt-3" type="button" onClick={issue}>
          Issue challenge
        </Button>
        {challenge ? (
          <div className="mt-4 space-y-2">
            <p className="font-mono text-xs text-ink/70">
              challengeId {challenge.challengeId}
              <br />
              nonce {challenge.nonce}
              <br />
              expires {new Date(challenge.expiresAt * 1000).toLocaleTimeString()}
            </p>
            <CodeBlock value={buildAuthSigningMessage(challenge)} />
          </div>
        ) : null}
      </Card>

      <Card>
        <h2>Sign</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" disabled={!challenge} onClick={() => void signNostr()}>
            Sign with NIP-07
          </Button>
        </div>
        <Field label="Auth event">
          <TextArea rows={8} value={eventJson} onChange={(e) => setEventJson(e.target.value)} />
        </Field>
        <Field label="Optional BCH signature">
          <TextArea rows={2} value={bchSig} onChange={(e) => setBchSig(e.target.value)} />
        </Field>
        {challenge && bchSig && w.binding ? (
          <p className="text-xs text-ink/60">
            BCH check:{" "}
            {verifyBchMessage(
              buildAuthSigningMessage(challenge),
              w.binding.statement.bchAddress,
              bchSig
            ).valid
              ? "matches bound address"
              : "does not match"}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" disabled={!challenge || !eventJson} onClick={() => void check(false)}>
            Verify response
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={!challenge || !eventJson}
            onClick={() => void check(true)}
          >
            Submit again
          </Button>
        </div>
      </Card>

      {result ? (
        <Card>
          <Pill tone={result.ok ? "ok" : "bad"}>{result.status}</Pill>
          <ul className="mt-3 space-y-1 text-sm text-ink/80">
            {result.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      <ErrorBox message={error} />
    </div>
  );
}
