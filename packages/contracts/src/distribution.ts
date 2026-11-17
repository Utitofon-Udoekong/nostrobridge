import {
  BCH_ASSET,
  FLDCH_CATEGORY_HEX,
  PROOF_DEPTH,
  buildClaimTree,
  bytesToHex,
  hexToBytes,
  type MerkleProof,
} from "./merkle.ts";

export type ClaimAsset = "bch" | "fldch";

export interface DistributionEntitlement {
  index: number;
  label: string;
  claimantPkh: string;
  amount: string;
}

export interface PublishedEntitlement extends DistributionEntitlement {
  leaf: string;
  path: number;
  siblings: [string, string, string, string];
}

export interface PublishedDistribution {
  protocol: "claimforge/v1";
  epoch: number;
  asset: ClaimAsset;
  assetCategory: string;
  depth: number;
  root: string;
  entitlements: PublishedEntitlement[];
}

export function assetCategoryBytes(asset: ClaimAsset): Uint8Array {
  if (asset === "bch") return BCH_ASSET;
  if (asset === "fldch") return hexToBytes(FLDCH_CATEGORY_HEX);
  const unexpected: never = asset;
  throw new Error(`Unknown claim asset ${String(unexpected)}`);
}

export function publishDistribution(
  epoch: number,
  asset: ClaimAsset,
  entitlements: readonly DistributionEntitlement[],
): PublishedDistribution {
  const category = assetCategoryBytes(asset);
  const tree = buildClaimTree(
    entitlements.map((entry) => ({
      index: entry.index,
      claimantPkh: hexToBytes(entry.claimantPkh),
      amount: BigInt(entry.amount),
    })),
    epoch,
    category,
  );
  const byIndex = new Map(tree.proofs.map((proof) => [proof.index, proof]));
  return {
    protocol: "claimforge/v1",
    epoch,
    asset,
    assetCategory: bytesToHex(category),
    depth: PROOF_DEPTH,
    root: bytesToHex(tree.root),
    entitlements: entitlements.map((entry) => {
      const proof = byIndex.get(entry.index);
      if (proof === undefined) throw new Error(`Missing proof for index ${entry.index}`);
      return { ...entry, ...publishedProof(proof) };
    }),
  };
}

function publishedProof(proof: MerkleProof): Pick<PublishedEntitlement, "leaf" | "path" | "siblings"> {
  return {
    leaf: bytesToHex(proof.leaf),
    path: proof.path,
    siblings: [
      bytesToHex(proof.siblings[0]),
      bytesToHex(proof.siblings[1]),
      bytesToHex(proof.siblings[2]),
      bytesToHex(proof.siblings[3]),
    ],
  };
}
