import { sha256 } from "@noble/hashes/sha256";

/** Fixed proof depth. 16 leaves keep the covenant inside BCH hash and op-cost limits. */
export const PROOF_DEPTH = 4;
export const LEAF_COUNT = 1 << PROOF_DEPTH;
export const LEAF_VERSION = 0x01;

/** FoldingCash FLDCH category, display order. Eight decimal places. */
export const FLDCH_CATEGORY_HEX =
  "0adb865ee9cc3038de87fba682e6cd361414edc9acff0da2fd0690d75341c640";

export const BCH_ASSET = new Uint8Array(32);

export interface ClaimLeafInput {
  index: number;
  claimantPkh: Uint8Array;
  amount: bigint;
}

export interface MerkleProof {
  index: number;
  leaf: Uint8Array;
  siblings: readonly [Uint8Array, Uint8Array, Uint8Array, Uint8Array];
  /** Bit i set means the node is the right child at level i. */
  path: number;
}

export interface BuiltClaimTree {
  root: Uint8Array;
  depth: number;
  leafHashes: Uint8Array[];
  proofs: MerkleProof[];
}

export function sha256Bytes(data: Uint8Array): Uint8Array {
  return sha256(data);
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0 || /[^0-9a-fA-F]/.test(clean)) {
    throw new Error("Expected even-length hex");
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left[i]! ^ right[i]!;
  }
  return diff === 0;
}

function concat(left: Uint8Array, right: Uint8Array): Uint8Array {
  const out = new Uint8Array(left.length + right.length);
  out.set(left, 0);
  out.set(right, left.length);
  return out;
}

function writeUintLe(target: Uint8Array, offset: number, value: bigint, width: number): void {
  if (value < 0n || value >= 1n << BigInt(width * 8)) {
    throw new Error(`Integer does not fit in ${width} bytes`);
  }
  let rest = value;
  for (let i = 0; i < width; i += 1) {
    target[offset + i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
}

/** Pad node for an unused leaf. Not a valid version-0x01 claim preimage. */
export function padLeaf(): Uint8Array {
  return sha256Bytes(new Uint8Array(33));
}

/**
 * 65-byte claim preimage.
 * 0x01 || pkh[20] || amount little-endian uint64 || epoch little-endian uint32 || asset[32]
 */
export function leafPreimage(
  claimantPkh: Uint8Array,
  amount: bigint,
  epoch: number,
  assetCategory: Uint8Array,
): Uint8Array {
  if (claimantPkh.length !== 20) throw new Error("Claimant hash must be 20 bytes");
  if (assetCategory.length !== 32) throw new Error("Asset category must be 32 bytes");
  if (!Number.isInteger(epoch) || epoch <= 0 || epoch > 0xffffffff) {
    throw new Error("Epoch must be a positive uint32");
  }
  const out = new Uint8Array(65);
  out[0] = LEAF_VERSION;
  out.set(claimantPkh, 1);
  writeUintLe(out, 21, amount, 8);
  writeUintLe(out, 29, BigInt(epoch), 4);
  out.set(assetCategory, 33);
  return out;
}

export function claimLeaf(
  claimantPkh: Uint8Array,
  amount: bigint,
  epoch: number,
  assetCategory: Uint8Array,
): Uint8Array {
  return sha256Bytes(leafPreimage(claimantPkh, amount, epoch, assetCategory));
}

export function buildClaimTree(
  entries: readonly ClaimLeafInput[],
  epoch: number,
  assetCategory: Uint8Array,
): BuiltClaimTree {
  if (entries.length === 0) throw new Error("A published tree needs at least one entitlement");
  const leafHashes = Array.from({ length: LEAF_COUNT }, () => padLeaf());
  const seen = new Set<number>();
  for (const entry of entries) {
    if (!Number.isInteger(entry.index) || entry.index < 0 || entry.index >= LEAF_COUNT) {
      throw new Error(`Leaf index ${entry.index} is outside 0..${LEAF_COUNT - 1}`);
    }
    if (seen.has(entry.index)) throw new Error(`Duplicate leaf index ${entry.index}`);
    seen.add(entry.index);
    leafHashes[entry.index] = claimLeaf(entry.claimantPkh, entry.amount, epoch, assetCategory);
  }

  const levels: Uint8Array[][] = [leafHashes];
  for (let depth = 0; depth < PROOF_DEPTH; depth += 1) {
    const previous = levels[depth];
    if (previous === undefined) throw new Error("Missing Merkle level");
    const next: Uint8Array[] = [];
    for (let i = 0; i < previous.length; i += 2) {
      const left = previous[i];
      const right = previous[i + 1];
      if (left === undefined || right === undefined) throw new Error("Uneven Merkle level");
      next.push(sha256Bytes(concat(left, right)));
    }
    levels.push(next);
  }

  const rootLevel = levels[PROOF_DEPTH];
  const root = rootLevel?.[0];
  if (root === undefined) throw new Error("Missing Merkle root");

  const proofs = entries.map((entry) => proofFor(entry.index, levels, leafHashes[entry.index]!));
  return { root, depth: PROOF_DEPTH, leafHashes, proofs };
}

function proofFor(index: number, levels: Uint8Array[][], leaf: Uint8Array): MerkleProof {
  const siblings: Uint8Array[] = [];
  let path = 0;
  let cursor = index;
  for (let depth = 0; depth < PROOF_DEPTH; depth += 1) {
    const level = levels[depth];
    if (level === undefined) throw new Error("Missing proof level");
    const sibling = level[cursor ^ 1];
    if (sibling === undefined) throw new Error("Missing sibling");
    siblings.push(sibling);
    if ((cursor & 1) === 1) path |= 1 << depth;
    cursor >>= 1;
  }
  const [sibling0, sibling1, sibling2, sibling3] = siblings;
  if (
    sibling0 === undefined ||
    sibling1 === undefined ||
    sibling2 === undefined ||
    sibling3 === undefined
  ) {
    throw new Error("Proof must contain 4 siblings");
  }
  return { index, leaf, siblings: [sibling0, sibling1, sibling2, sibling3], path };
}

/** Recompute the root from a leaf and a proof. This is the off-chain half of the covenant check. */
export function foldProof(
  leaf: Uint8Array,
  siblings: readonly [Uint8Array, Uint8Array, Uint8Array, Uint8Array],
  path: number,
): Uint8Array {
  let node = leaf;
  for (let depth = 0; depth < PROOF_DEPTH; depth += 1) {
    const sibling = siblings[depth];
    if (sibling === undefined || sibling.length !== 32) throw new Error("Sibling must be 32 bytes");
    const onRight = (path & (1 << depth)) !== 0;
    node = sha256Bytes(onRight ? concat(sibling, node) : concat(node, sibling));
  }
  return node;
}

export function verifyMerkleProof(
  leaf: Uint8Array,
  siblings: readonly [Uint8Array, Uint8Array, Uint8Array, Uint8Array],
  path: number,
  root: Uint8Array,
): boolean {
  return bytesEqual(foldProof(leaf, siblings, path), root);
}
