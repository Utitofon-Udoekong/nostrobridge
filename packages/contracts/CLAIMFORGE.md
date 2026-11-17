# ClaimForge protocol

ClaimForge pays a published list of Bitcoin Cash or FLDCH entitlements. The payer funds one SolidCash contract. Each claimant pulls their own output. Nobody else can redirect it, and the same leaf cannot be paid twice.

## What is published

An epoch is one Merkle tree. The publisher puts four values in the contract's data NFT:

| Field | Meaning |
| --- | --- |
| `root` | 32-byte SHA-256 Merkle root |
| `epoch` | positive uint32, must increase when the root is replaced |
| `assetCategory` | 32 zero bytes to pay BCH, or the 32-byte CashTokens category id to pay that token |
| `claimed` | a verified mapping from leaf to `true` |

FoldingCash's FLDCH category, display order, is `0adb865ee9cc3038de87fba682e6cd361414edc9acff0da2fd0690d75341c640`. FLDCH has eight decimal places. A BCH amount is satoshis. The contract does not mint FLDCH. A distributor deposits an already-released balance and publishes the root for that month's entitlements.

The tree is a complete binary tree of depth 4 (16 leaves). Unused positions hold the pad hash `SHA256(0x00 || 32 zero bytes)`. That pad is not a claim preimage.

## Leaf

The leaf is one SHA-256 over a fixed 65-byte preimage. Integers are little-endian, the same width Bitcoin Cash `OP_NUM2BIN` writes.

```text
0x01 || pkh[20] || amount[8] || epoch[4] || assetCategory[32]
```

`pkh` is HASH160 of the claimant's compressed public key, the payload of their P2PKH cashaddr. `amount` is the base units to pay. `epoch` and `assetCategory` are the values stored in the contract, so a later epoch produces different leaves even for the same person and amount.

## Proof

A proof is four sibling hashes and a path byte. Bit `i` of the path is set when the node is the right child at level `i`, counting from the leaf. The parent is `SHA256(sibling || node)` in that case and `SHA256(node || sibling)` otherwise. Four levels is 128 bytes of siblings. The covenant unrolls the four hashes. There is no loop and no variable-length proof, which is what keeps the script inside Bitcoin Cash hash and operation-cost limits. One claimant is one transaction. A distribution does not need a single input per person.

## Claim

`claimBch` pays satoshis from the contract's satoshi container. `claimToken` pays fungible CashTokens from the container for the category argument, and that category must equal `assetCategory`.

The claimant passes their public key, a transaction signature, the P2PKH locking bytecode, the four siblings, the path, and the leaf hash. The covenant checks, in one transaction:

1. The signature is valid for the public key.
2. `HASH160(publicKey)` is the leaf's `pkh`.
3. The locking bytecode is the standard P2PKH script for that `pkh`, and the payment output uses that script and the leaf's amount.
4. Folding the computed leaf through the siblings produces `root`.
5. The verified-mapping entry for that leaf is absent, then the transaction inserts it.

A second transaction that presents the same leaf finds the entry and fails. A sibling, path, amount, or public key that does not belong to the published leaf fails before any output is paid. `msg.sender` is not an authorization check. SolidCash's direct composition does not authenticate it.

The spent-leaf key is passed as an argument so the SDK can select the mapping entry. The covenant recomputes the leaf and requires the argument to equal it, so a caller cannot mark a different key spent.

## Checking someone else's claim

A third party does not trust the ClaimForge application.

1. Read `root`, `epoch`, and `assetCategory` from the contract's data NFT commitment, or from the transaction that published them.
2. Rebuild the leaf from the claimant's cashaddr payload, the amount, the epoch, and the category, using the preimage above.
3. Fold the published siblings. The result must equal `root`.
4. On the claim transaction, the paid output's locking bytecode must be `OP_DUP OP_HASH160 <pkh> OP_EQUALVERIFY OP_CHECKSIG` and its value must be the leaf amount. The transaction must also spend the previous `claimed` entry (or its predecessor, on the first claim) and write that leaf as claimed.

The same checks are implemented off-chain by `verifyMerkleProof` in `packages/contracts/src/merkle.ts` and on-chain by `ClaimForge.scash`. The solidhat tests deploy the contract, pay two real mock-network claims, and reject a replay, a corrupted sibling, and a signature from the wrong key.

A verified bchblaze-id binding can be checked beside the claim. `verify()` accepts the Nostr event alone. The cashaddr inside that event must carry the same HASH160 as the leaf. The binding does not move the coins. It tells a third party which Nostr key belongs to the claimant.
