# Nostrobridge

![Nostrobridge](apps/nostrobridge/public/logo.jpg)

Template: https://docs.google.com/presentation/d/1xXuMJabCT37gEmyWFrLNhLbdS-MZ2b4ajE7Bif-I644/edit?usp=sharing
github: https://github.com/Utitofon-Udoekong/nostrobridge
site: https://nostrobridge.vercel.app/
cashtokenaddress: bitcoincash:zrf7lfu7ec657h69me9wm8ye04w36nxfzy6jdvqeqd

Bind a Bitcoin Cash address to a Nostr key. One person, two signatures, and a check anyone can run without trusting this site.

## The problem

A Bitcoin Cash address and a Nostr key are separate. A payer, a site, or a contract has no way to know they belong to the same person unless someone asserts it. A relay can deliver that assertion. It cannot make it true.

Two public drafts were the wrong fit. Kind 30078 is author-only storage, so a payer never sees the record. Kind 31234 is an encrypted draft, and the Bitcoin Cash signature never rides in the event. Nostrobridge is one public record that carries both signatures over the same statement.

## How it works

The app builds one canonical statement: sorted JSON, no whitespace, then a SHA-256 binding id. The Bitcoin Cash wallet signs that string with `signmessage`. The Nostr key signs a kind **30734** event whose content is the same string. The Bitcoin Cash signature sits in a NIP-39 `i` tag, so the event alone is the proof.

`verify()` in `@bchblaze/identity` checks both signatures offline. Kinds 30078 and 31234 fail closed. The stable `d` tag is `bchblaze-id/v1`, so a new binding replaces the old one for that key. A login is a separate ephemeral kind **22243** challenge. It is not the binding, and a repeated challenge is rejected.

Private keys never enter the app. Paytaca or Electron Cash signs Bitcoin Cash. NIP-07, or a pasted event, signs Nostr.

The full byte layout is `packages/identity/protocol.md`.

## Key features

- **Bind.** Connect a cashaddr and an npub, generate the statement, collect both signatures, and publish the event.
- **Verify.** Paste a record or look one up by npub. The check runs in the browser. Tamper id and Tamper address show that a changed record fails closed.
- **Pay.** A verified npub resolves to its cashaddr. The page builds a BIP21 link and a QR code. Nothing is broadcast until a wallet sends it. The default network is mainnet and the default amount is 0.0001 BCH.
- **Authenticate.** Issue a short challenge for this site, sign it once, and reject a replay.
- **Anchor.** Turn a verified binding into a 32-byte CashTokens commitment. This prepares the commitment. It does not broadcast.
- **Relays.** Choose where a binding is published and looked up. Changing relays does not change how a signature is checked.

## Tech stack

| Piece | What it is |
| --- | --- |
| App | Next.js 15, React 18, TypeScript, Tailwind |
| Identity | `@bchblaze/identity` — `@noble/curves`, `@noble/hashes`, `nostr-tools`, Vitest |
| Wallets | Paytaca, WizardConnect (`@wizardconnect/*`), Electron Cash paste, NIP-07 |
| Pay | BIP21 and a QR code. The app does not broadcast |
| Anchor | SolidCash `IdentityAnchor` in `packages/contracts`. Prepared, not broadcast |
| Package manager | pnpm 9.15, Node 18+ |

## Hackathon requirements

| Requirement | Where it is |
| --- | --- |
| Identity creation, keys stay in the wallets | `/link` |
| Cryptographic binding of a cashaddr and an npub | Kind 30734, `d=bchblaze-id/v1`, both signatures over one statement |
| Not kind 30078 or 31234 | `verify()` rejects both |
| Decentralized discovery | Relays, `#d` and `#i=bch:<cashaddr>` |
| Verification without a server | `/verify` and `packages/identity` tests |
| Authentication that is not the binding | `/authenticate`, kind 22243, replay rejected |
| Pay the bound address | `/pay`, BIP21, mainnet by default |
| CashTokens commitment | `/anchor`, 32-byte commitment, not broadcast |
| Reusable library | `@bchblaze/identity`, with `packages/identity/protocol.md` |
| Top-of-page banner | Presentation, GitHub, and the EMBER2026 address, on `/` only |

## Run

The live demo is https://nostrobridge.vercel.app/. Bind a real address and npub, then check that record on Verify.

```bash
pnpm install
pnpm dev
```
