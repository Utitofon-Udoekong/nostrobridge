import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cashAddressFromPrivateKey, hash160, pubkeyFromPrivateKey } from "@bchblaze/identity";
import { bytesToHex } from "../src/merkle.ts";
import { publishDistribution } from "../src/distribution.ts";

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, "../../../apps/claimforge/public/distribution.json");

const holders = [
  { label: "Alice", key: Uint8Array.from({ length: 32 }, () => 0x33), index: 0, amount: "20000" },
  { label: "Bob", key: Uint8Array.from({ length: 32 }, () => 0x44), index: 3, amount: "15000" },
] as const;

const distribution = publishDistribution(
  1,
  "bch",
  holders.map((holder) => ({
    index: holder.index,
    label: holder.label,
    claimantPkh: bytesToHex(hash160(pubkeyFromPrivateKey(holder.key))),
    amount: holder.amount,
  })),
);

const published = {
  ...distribution,
  note: "Demo epoch. The private keys are public test keys. Do not fund them on mainnet.",
  holders: holders.map((holder) => ({
    label: holder.label,
    address: cashAddressFromPrivateKey(holder.key, "mainnet"),
  })),
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(published, null, 2)}\n`);
console.log(published.root);
console.log(outPath);
