import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { SignatureTemplate } from "@solidcash/solidcash";
import { hash160, pubkeyFromPrivateKey } from "@bchblaze/identity";
import { expect } from "chai";
import { ethers } from "hardhat";
import { publishDistribution } from "../src/distribution";
import {
  BCH_ASSET,
  buildClaimTree,
  bytesEqual,
  bytesToHex,
  hexToBytes,
  verifyMerkleProof,
  type MerkleProof,
} from "../src/merkle";

const EPOCH = 1;
const ALICE_AMOUNT = 20_000n;
const BOB_AMOUNT = 15_000n;
const ALICE_KEY = Uint8Array.from({ length: 32 }, () => 0x33);
const BOB_KEY = Uint8Array.from({ length: 32 }, () => 0x44);

interface Claimant {
  pkh: Uint8Array;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
  lockingBytecode: Uint8Array;
}

function asBytes(value: unknown, label: string): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (typeof value === "string") return hexToBytes(value);
  throw new Error(`${label} was ${typeof value}`);
}

function p2pkhLock(pkh: Uint8Array): Uint8Array {
  if (pkh.length !== 20) throw new Error("pkh must be 20 bytes");
  const lock = new Uint8Array(25);
  lock[0] = 0x76;
  lock[1] = 0xa9;
  lock[2] = 0x14;
  lock.set(pkh, 3);
  lock[23] = 0x88;
  lock[24] = 0xac;
  return lock;
}

function proofArgs(proof: MerkleProof): [Uint8Array, Uint8Array, Uint8Array, Uint8Array, number] {
  return [proof.siblings[0], proof.siblings[1], proof.siblings[2], proof.siblings[3], proof.path];
}

describe("ClaimForge", () => {
  async function deployFixture() {
    const signers = await ethers.getSigners();
    const publisher = signers[0];
    if (publisher === undefined) throw new Error("Expected a funded publisher");
    const alice = claimantFromKey(ALICE_KEY);
    const bob = claimantFromKey(BOB_KEY);
    const published = publishDistribution(EPOCH, "bch", [
      { index: 0, label: "Alice", claimantPkh: bytesToHex(alice.pkh), amount: ALICE_AMOUNT.toString() },
      { index: 3, label: "Bob", claimantPkh: bytesToHex(bob.pkh), amount: BOB_AMOUNT.toString() },
    ]);
    const onDisk = JSON.parse(readFileSync(resolve("..", "..", "apps", "claimforge", "public", "distribution.json"), "utf8")) as {
      root: string;
    };
    expect(onDisk.root).to.equal(published.root);
    const tree = buildClaimTree(
      [
        { index: 0, claimantPkh: alice.pkh, amount: ALICE_AMOUNT },
        { index: 3, claimantPkh: bob.pkh, amount: BOB_AMOUNT },
      ],
      EPOCH,
      BCH_ASSET,
    );
    expect(bytesToHex(tree.root)).to.equal(published.root);
    for (const proof of tree.proofs) {
      expect(verifyMerkleProof(proof.leaf, proof.siblings, proof.path, tree.root)).to.equal(true);
    }

    const factory = await ethers.getContractFactory("ClaimForge", publisher);
    const forge = await factory.deploy(publisher.publicKey, {
      initArgs: [tree.root, EPOCH, BCH_ASSET],
      initialBalance: 100_000n,
    });
    await forge.waitForDeployment();
    return { publisher, alice, bob, forge, tree };
  }

function claimantFromKey(privateKey: Uint8Array): Claimant {
  const publicKey = pubkeyFromPrivateKey(privateKey);
  const pkh = hash160(publicKey);
  return { pkh, publicKey, privateKey, lockingBytecode: p2pkhLock(pkh) };
}

function claimRecord(sent: unknown): { txid: string; hex: string } {
  if (sent && typeof sent === "object") {
    const record = sent as { txid?: unknown; hex?: unknown };
    if (typeof record.txid === "string" && typeof record.hex === "string") {
      return { txid: record.txid, hex: record.hex };
    }
  }
  throw new Error("Claim did not return a raw transaction");
}

  it("pays a valid BCH claim and records the leaf", async () => {
    const { publisher, alice, bob, forge, tree } = await deployFixture();
    const proof = tree.proofs[0];
    if (proof === undefined) throw new Error("Missing Alice proof");
    const [sibling0, sibling1, sibling2, sibling3, path] = proofArgs(proof);
    const preview = await forge.previewLeaf.staticCall(alice.pkh, ALICE_AMOUNT);
    expect(bytesToHex(asBytes(preview, "previewLeaf"))).to.equal(bytesToHex(proof.leaf));
    const storedRoot = await forge.root();
    expect(bytesToHex(asBytes(storedRoot, "root"))).to.equal(bytesToHex(tree.root));
    const storedEpoch = await forge.epoch();
    expect(storedEpoch === 1n || storedEpoch === 1).to.equal(true);
    const balance = await forge.getBalance();
    expect(balance >= ALICE_AMOUNT + BOB_AMOUNT).to.equal(true);

    const sendAlice = () =>
      forge.connect(publisher).claimBch(
        alice.pkh,
        ALICE_AMOUNT,
        sibling0,
        sibling1,
        sibling2,
        sibling3,
        path,
        alice.publicKey,
        new SignatureTemplate(alice.privateKey),
        alice.lockingBytecode,
        proof.leaf,
      ).transfer(alice.lockingBytecode, ALICE_AMOUNT);
    const aliceSent = await sendAlice();
    const aliceTx = claimRecord(aliceSent);
    const txid = aliceTx.txid;
    expect(txid).to.match(/^[0-9a-f]{64}$/);
    expect(aliceTx.hex.length).to.be.greaterThan(100);
    await expect(sendAlice()).to.be.reverted;

    const bobProof = tree.proofs[1];
    if (bobProof === undefined) throw new Error("Missing Bob proof");
    const [bob0, bob1, bob2, bob3, bobPath] = proofArgs(bobProof);
    const bobSent = await forge.connect(publisher).claimBch(
        bob.pkh,
        BOB_AMOUNT,
        bob0,
        bob1,
        bob2,
        bob3,
        bobPath,
        bob.publicKey,
        new SignatureTemplate(bob.privateKey),
        bob.lockingBytecode,
        bobProof.leaf,
      ).transfer(bob.lockingBytecode, BOB_AMOUNT);
    const bobTxRecord = claimRecord(bobSent);
    const bobTx = bobTxRecord.txid;
    expect(bobTx).to.match(/^[0-9a-f]{64}$/);
    expect(bobTx).to.not.equal(txid);
    writeFileSync(
      resolve("..", "..", "apps", "claimforge", "public", "last-claim.json"),
      `${JSON.stringify({
        network: "mock",
        note: "Produced by the solidhat mock network. The BCH 2026 VM accepted both claim transactions. This network is not a public explorer.",
        root: bytesToHex(tree.root),
        claims: [
          { who: "Alice", amountSats: ALICE_AMOUNT.toString(), ...aliceTx },
          { who: "Bob", amountSats: BOB_AMOUNT.toString(), ...bobTxRecord },
        ],
      }, null, 2)}\n`,
    );

    const claimed = await forge.claimed(proof.leaf);
    expect(claimed === true || claimed === 1n).to.equal(true);
    const root = await forge.root();
    expect(bytesEqual(asBytes(root, "root"), tree.root)).to.equal(true);
  }, 120_000);

  it("rejects a bad sibling and a signature from the wrong key before any payout", async () => {
    const { publisher, alice, bob, forge, tree } = await deployFixture();
    const proof = tree.proofs[0];
    if (proof === undefined) throw new Error("Missing Alice proof");
    const [sibling0, sibling1, sibling2, sibling3, path] = proofArgs(proof);
    const broken = new Uint8Array(sibling0);
    broken[0] ^= 0xff;
    await expect(
      forge.connect(publisher).claimBch(
        alice.pkh,
        ALICE_AMOUNT,
        broken,
        sibling1,
        sibling2,
        sibling3,
        path,
        alice.publicKey,
        new SignatureTemplate(alice.privateKey),
        alice.lockingBytecode,
        proof.leaf,
      ).transfer(alice.lockingBytecode, ALICE_AMOUNT),
    ).to.be.reverted;

    await expect(
      forge.connect(publisher).claimBch(
        alice.pkh,
        ALICE_AMOUNT,
        sibling0,
        sibling1,
        sibling2,
        sibling3,
        path,
        bob.publicKey,
        new SignatureTemplate(bob.privateKey),
        alice.lockingBytecode,
        proof.leaf,
      ).transfer(alice.lockingBytecode, ALICE_AMOUNT),
    ).to.be.reverted;

    const claimed = await forge.claimed(proof.leaf);
    expect(claimed === false || claimed === 0n).to.equal(true);
  }, 120_000);
});
