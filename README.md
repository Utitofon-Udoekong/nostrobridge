# Nostrobridge — BCH ↔ Nostr identity

Production cryptographic binding of a Bitcoin Cash address to a Nostr npub, built for the Paytaca-sponsored **BCH BLAZE 2026** decentralized-identity bounty.

Private keys never enter the app. Paytaca / Electron Cash signs the BCH message. NIP-07 signs the Nostr event. `verify()` is a pure function in `@bchblaze/identity`.

## 3-minute judge path

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

1. **Overview** — bounty coverage and why kind 30078 is not used.
2. **Verify without a wallet** (`/verify`) — click **Load throwaway sample binding**. Status must be `verified`. Press **Tamper bindingId** and **Tamper cashaddr**. Both must fail closed. Then run the Node command below on `apps/nostrobridge/public/sample-binding.json` so you are not trusting the site.
3. **Create binding** (`/link`) — Connect Paytaca or WizardConnect (or paste a cashaddr) and NIP-07 (or paste npub). Generate the statement. Sign in Paytaca / Electron Cash. Sign the event (NIP-07 or paste). Publish to the configured relays.
4. **Authenticate** (`/authenticate`) — Issue a challenge, sign it, verify, then **Submit the same challenge again**. Expect `replay_detected`.
5. **Pay identity** (`/pay`) — paste an npub with a published binding, or **Use locally stored binding**. Only a verified address yields a BIP21 URI / QR. Default amount is `0.0001` BCH on **mainnet** (chipnet is a labeled toggle under Relays). Do not pay the throwaway sample address.
6. **CashTokens** (`/anchor`) — **Prepare on-chain anchor** shows the 32-byte NFT commitment and the SolidCash `IdentityAnchor` constructor args. It does not broadcast.

Banner links (Widget Factory, GitHub, EMBER2026 CashTokens address) are env-configurable. See `apps/nostrobridge/.env.example`.

### Verify without trusting the site

From the repo root, after `pnpm install` + `pnpm --filter @bchblaze/identity build`:

```bash
node --input-type=module -e "import { readFileSync } from 'node:fs'; import { verify } from '@bchblaze/identity'; console.log(verify(readFileSync('apps/nostrobridge/public/sample-binding.json','utf8')));"
```

Same `verify()` function the UI calls. Relays cannot make it return `ok`. Tamper any field in that JSON and it fails.

## Bounty requirements

| Requirement | Where |
|---|---|
| Identity creation & management | `/link` — keys stay in wallets |
| Cryptographic identity binding | Dual proofs, kind **30734**, protocol `bchblaze-id` |
| Decentralized discovery | Relays + `#d=bchblaze-id/v1` / `#i=bch:<cashaddr>` |
| Verification & authentication | `/verify`, `/authenticate`, `packages/identity` tests |
| Working demo + docs | this app, `packages/identity/protocol.md` |
| Stretch: pay via identity | `/pay` BIP21 after local verify |
| Stretch: CashTokens commitment | `packages/contracts` + `/anchor` |
| Stretch: reusable library | `@bchblaze/identity` |

## Packages

- `packages/identity` — protocol library (vitest, offline `verify()`)
- `packages/contracts` — SolidCash `IdentityAnchor.scash` skeleton
- `apps/nostrobridge` — Next.js App Router demo

## Configuration

Copy `apps/nostrobridge/.env.example` to `apps/nostrobridge/.env.local`:

- `NEXT_PUBLIC_WIDGET_FACTORY_URL`
- `NEXT_PUBLIC_GITHUB_URL`
- `NEXT_PUBLIC_EMBER2026_ADDRESS`
- `NEXT_PUBLIC_NETWORK` (`mainnet` or `chipnet`)
- `NEXT_PUBLIC_DEFAULT_AMOUNT_BCH`
