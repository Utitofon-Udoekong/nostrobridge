import Link from "next/link";
import { BINDING_KIND } from "@bchblaze/identity";
import { Card, Pill } from "@/components/ui";

const STEPS = [
  {
    href: "/link",
    n: "01",
    title: "Bind",
    body: "Connect Paytaca or WizardConnect and a Nostr key. Both sign the same canonical statement.",
  },
  {
    href: "/verify",
    n: "02",
    title: "Verify",
    body: "Paste an npub or the JSON. The library rechecks both signatures in the browser. Tamper it and it fails.",
  },
  {
    href: "/authenticate",
    n: "03",
    title: "Authenticate",
    body: "A binding is not a session. Issue a short challenge. Replay of the same nonce is rejected.",
  },
  {
    href: "/pay",
    n: "04",
    title: "Pay",
    body: "Resolve a cashaddr from an npub only after verify(), then open a small real BIP21 payment.",
  },
];

const BOUNTY = [
  ["Identity creation", "Keys stay in Paytaca and NIP-07. This app stores the public record only."],
  ["Cryptographic binding", `BCH signmessage plus Nostr kind ${BINDING_KIND}. A kind 0 profile claim is not a proof.`],
  ["Discovery", "Relays are queried by author or i-tag, then every event is verified offline."],
  ["Authentication", "verify() is pure. Challenges carry a nonce, audience, action, and a seen-set."],
  ["Working demo", "This app, protocol.md, and the @bchblaze/identity test suite."],
  ["Pay via identity", "/pay builds a BIP21 URI only for an address that just verified."],
  ["CashTokens", "SolidCash IdentityAnchor pins a 32-byte NFT commitment of the binding."],
] as const;

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="grid items-end gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <div className="space-y-6">
          <Pill tone="ok">Paytaca bounty · Decentralized identity</Pill>
          <h1 className="max-w-xl text-5xl leading-[0.95] text-white sm:text-6xl">
            One person.
            <br />
            Two sovereign keys.
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-slate-300 sm:text-lg">
            Nostrobridge binds a Bitcoin Cash address to a Nostr npub. Both keys sign
            the same statement. Relays can carry it. They cannot mint it.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/link"
              className="rounded-full bg-bch-500 px-5 py-2.5 text-sm font-medium text-ink-950 no-underline hover:bg-bch-400"
            >
              Create a binding
            </Link>
            <Link
              href="/verify"
              className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white no-underline hover:bg-white/5"
            >
              Verify offline
            </Link>
          </div>
        </div>

        <Card accent="bch" className="bg-ink-900/90">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            What gets signed
          </p>
          <p className="mt-3 font-display text-2xl text-white">bchblaze-id / v1</p>
          <dl className="mt-5 space-y-3 text-sm">
            <Row k="BCH" v="P2PKH cashaddr" tone="text-bch-400" />
            <Row k="Nostr" v={`kind ${BINDING_KIND} · d = bchblaze-id/v1`} tone="text-nostr-400" />
            <Row k="Binding ID" v="SHA-256 of the sorted statement" tone="text-slate-200" />
          </dl>
          <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-relaxed text-slate-500">
            Kind 30078 is private app data. Kind 31234 is an encrypted draft. Neither can be a public proof.
          </p>
        </Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((step) => (
          <Link key={step.href} href={step.href} className="group no-underline">
            <Card className="h-full transition group-hover:border-white/20 group-hover:bg-ink-800/80">
              <p className="font-mono text-[11px] text-bch-400">{step.n}</p>
              <h2 className="mt-3 text-lg font-medium text-white">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{step.body}</p>
            </Card>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <h2 className="text-lg font-medium text-white">Bounty coverage</h2>
          <ul className="mt-4 divide-y divide-white/5">
            {BOUNTY.map(([req, met]) => (
              <li key={req} className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
                <p className="text-sm text-bch-400">{req}</p>
                <p className="text-sm leading-relaxed text-slate-300">{met}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card accent="amber">
          <h2 className="text-lg font-medium text-white">Do not trust this site</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Export the IdentityBinding JSON and run <code className="text-bch-400">verify()</code> from{" "}
            <code className="text-bch-400">@bchblaze/identity</code> in Node. The page at{" "}
            <Link href="/verify" className="text-bch-400 underline decoration-bch-500/40 underline-offset-4">
              /verify
            </Link>{" "}
            calls that same function in your browser. A flipped bindingId, cashaddr, or either signature fails closed.
          </p>
          <p className="mt-4 font-mono text-[11px] leading-relaxed text-slate-500">
            protocol bchblaze-id
            <br />
            d-tag bchblaze-id/v1
            <br />
            spec packages/identity/protocol.md
          </p>
        </Card>
      </section>
    </div>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-white/5 pb-3 last:border-0 last:pb-0">
      <dt className="font-mono text-[11px] uppercase tracking-wider text-slate-500">{k}</dt>
      <dd className={`text-right text-sm ${tone}`}>{v}</dd>
    </div>
  );
}
