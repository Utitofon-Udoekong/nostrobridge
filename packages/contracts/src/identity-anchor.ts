import {
  decodeCashAddress,
  isP2pkhType,
  prepareCashTokenCommitment,
  type IdentityBinding,
} from "@bchblaze/identity";

export const IDENTITY_ANCHOR_CONTRACT = "IdentityAnchor";
export const IDENTITY_ANCHOR_SOURCE_PATH = "contracts/IdentityAnchor.scash";

export const IDENTITY_ANCHOR_SOURCE = `pragma solidcash ^0.51.0;

contract IdentityAnchor(bytes20 ownerPkh) {
    bytes32 public bindingCommitment;

    constructor(bytes32 initialCommitment) {
        this.bindingCommitment = initialCommitment;
    }

    function reanchor(bytes32 newCommitment, pubkey pk, sig s) {
        require(hash160(pk) == ownerPkh);
        require(checkSig(s, pk));
        require(newCommitment != this.bindingCommitment);
        this.bindingCommitment = newCommitment;
    }

    function release(pubkey pk, sig s) {
        require(hash160(pk) == ownerPkh);
        require(checkSig(s, pk));
    }
}
`;

export interface IdentityAnchorPlan {
  contract: typeof IDENTITY_ANCHOR_CONTRACT;
  sourcePath: typeof IDENTITY_ANCHOR_SOURCE_PATH;
  source: string;
  ownerPkhHex: string;
  ownerAddress: string;
  commitmentHex: string;
  commitmentBytes: Uint8Array;
  bindingId: string;
  nostrEventId: string;
  domain: string;
  constructorArgs: {
    ownerPkh: string;
    initialCommitment: string;
  };
  notes: string[];
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function planIdentityAnchor(binding: IdentityBinding): IdentityAnchorPlan {
  const decoded = decodeCashAddress(binding.statement.bchAddress);
  if (!isP2pkhType(decoded.type)) {
    throw new Error("IdentityAnchor requires a P2PKH (q or z) cashaddr");
  }
  const commitment = prepareCashTokenCommitment(binding);
  const ownerPkhHex = bytesToHex(decoded.hash);

  return {
    contract: IDENTITY_ANCHOR_CONTRACT,
    sourcePath: IDENTITY_ANCHOR_SOURCE_PATH,
    source: IDENTITY_ANCHOR_SOURCE,
    ownerPkhHex,
    ownerAddress: binding.statement.bchAddress,
    commitmentHex: commitment.hex,
    commitmentBytes: commitment.bytes,
    bindingId: commitment.bindingId,
    nostrEventId: commitment.nostrEventId,
    domain: commitment.domain,
    constructorArgs: {
      ownerPkh: `0x${ownerPkhHex}`,
      initialCommitment: `0x${commitment.hex}`,
    },
    notes: [
      "NFT commitment is 32 bytes and fits the CashTokens 40-byte consensus limit.",
      "Genesis: IdentityAnchor(ownerPkh) with constructor(initialCommitment).",
      "A later rebind produces a different commitment; the NFT will not match.",
      "This plan does not broadcast. A SolidCash SDK / wallet signs genesis.",
    ],
  };
}
