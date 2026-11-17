"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { BchNetwork, IdentityBinding } from "@bchblaze/identity";
import { normalizeCashAddress } from "@bchblaze/identity";
import {
  clearBinding,
  loadBinding,
  loadNetwork,
  loadRelays,
  saveBinding,
  saveNetwork,
  saveRelays,
} from "@/lib/storage";
import { probePaytaca } from "@/lib/bch-wallet";
import { getNip07 } from "@/lib/nostr";

export type BchSource = "paytaca" | "wizardconnect" | "paste";
export type NostrSource = "nip07" | "paste";

interface WalletState {
  network: BchNetwork;
  setNetwork: (n: BchNetwork) => void;
  bchAddress: string;
  setBchAddress: (v: string) => void;
  bchSource: BchSource | null;
  setBchSource: (v: BchSource | null) => void;
  nostrPubkey: string;
  setNostrPubkey: (v: string) => void;
  nostrSource: NostrSource | null;
  setNostrSource: (v: NostrSource | null) => void;
  relays: string[];
  setRelays: (v: string[]) => void;
  binding: IdentityBinding | null;
  setBinding: (b: IdentityBinding | null) => void;
  paytacaDetected: boolean | null;
  nip07Detected: boolean;
}

const Ctx = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [network, setNetworkState] = useState<BchNetwork>("mainnet");
  const [bchAddress, setBchAddress] = useState("");
  const [bchSource, setBchSource] = useState<BchSource | null>(null);
  const [nostrPubkey, setNostrPubkey] = useState("");
  const [nostrSource, setNostrSource] = useState<NostrSource | null>(null);
  const [relays, setRelaysState] = useState<string[]>([]);
  const [binding, setBindingState] = useState<IdentityBinding | null>(null);
  const [paytacaDetected, setPaytacaDetected] = useState<boolean | null>(null);
  const [nip07Detected, setNip07Detected] = useState(false);

  useEffect(() => {
    setNetworkState(loadNetwork());
    setRelaysState(loadRelays());
    setBindingState(loadBinding());
    setNip07Detected(Boolean(getNip07()));
    void probePaytaca().then(setPaytacaDetected);
  }, []);

  const setNetwork = useCallback((n: BchNetwork) => {
    setNetworkState(n);
    saveNetwork(n);
  }, []);

  const setRelays = useCallback((v: string[]) => {
    setRelaysState(v);
    saveRelays(v);
  }, []);

  const setBinding = useCallback((b: IdentityBinding | null) => {
    setBindingState(b);
    if (b) saveBinding(b);
    else clearBinding();
  }, []);

  const value = useMemo<WalletState>(
    () => ({
      network,
      setNetwork,
      bchAddress,
      setBchAddress: (v) => {
        setBchAddress(v ? normalizeCashAddress(v, network) : "");
      },
      bchSource,
      setBchSource,
      nostrPubkey,
      setNostrPubkey,
      nostrSource,
      setNostrSource,
      relays,
      setRelays,
      binding,
      setBinding,
      paytacaDetected,
      nip07Detected,
    }),
    [
      network,
      setNetwork,
      bchAddress,
      bchSource,
      nostrPubkey,
      nostrSource,
      relays,
      setRelays,
      binding,
      setBinding,
      paytacaDetected,
      nip07Detected,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet(): WalletState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
