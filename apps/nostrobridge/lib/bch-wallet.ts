export interface PaytacaBridge {
  connect: () => void;
  connected: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  address: () => Promise<string>;
  signMessage: (options: {
    message: string;
    userPrompt?: string;
  }) => Promise<string | { signature?: string } | undefined>;
  signTransaction?: (options: unknown) => Promise<unknown>;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    paytaca?: PaytacaBridge;
  }
}

export function getPaytaca(): PaytacaBridge | null {
  if (typeof window === "undefined") return null;
  return window.paytaca ?? null;
}

export async function probePaytaca(timeoutMs = 1500): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (getPaytaca()) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return Boolean(getPaytaca());
}

export async function connectPaytaca(): Promise<string> {
  const bridge = getPaytaca();
  if (!bridge) throw new Error("Paytaca is not installed");
  const already = await bridge.connected().catch(() => false);
  if (!already) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Paytaca connect timed out")), 60_000);
      bridge.on("addressChanged", () => {
        clearTimeout(timer);
        resolve();
      });
      try {
        bridge.connect();
      } catch (e) {
        clearTimeout(timer);
        reject(e);
      }
    });
  }
  return bridge.address();
}

export async function signPaytacaMessage(message: string): Promise<string> {
  const bridge = getPaytaca();
  if (!bridge) throw new Error("Paytaca is not installed");
  const result = await bridge.signMessage({
    message,
    userPrompt: "Sign the Nostrobridge identity statement",
  });
  if (!result) throw new Error("Paytaca did not return a signature");
  if (typeof result === "string") return result;
  if (result.signature) return result.signature;
  throw new Error("Unexpected Paytaca signMessage result");
}
