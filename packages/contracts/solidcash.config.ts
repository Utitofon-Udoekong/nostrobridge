import { defineConfig } from "@solidcash/solidhat/config";

const mockMnemonic =
  process.env.SOLIDCASH_MNEMONIC ??
  "test test test test test test test test test test test junk";

export default defineConfig({
  paths: {
    contracts: "contracts",
    artifacts: "artifacts",
    tests: "test",
  },
  // Native NUM2BIN encoding. evmCompat would swap the leaf to big-endian and
  // the published preimage in src/merkle.ts would no longer match the covenant.
  compiler: { evmCompat: false },
  mnemonic: mockMnemonic,
  accounts: { count: 4, satoshis: 100_000_000n },
  networks: {
    mock: { type: "mock" },
    chipnet: {
      type: "electrum",
      network: "chipnet",
      mnemonic: process.env.SOLIDCASH_MNEMONIC_CHIPNET,
    },
    mainnet: {
      type: "electrum",
      network: "mainnet",
      mnemonic: process.env.SOLIDCASH_MNEMONIC_MAINNET,
    },
  },
  defaultNetwork: "mock",
});
