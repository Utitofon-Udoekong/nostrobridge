import { NextResponse } from "next/server";

const HASKOIN = "https://api.haskoin.com/bch";

interface TxRef {
  txid: string;
}

interface TxOutput {
  address?: string;
  value?: number;
}

interface TxDetails {
  txid?: string;
  outputs?: TxOutput[];
}

function isTxRefList(value: unknown): value is TxRef[] {
  return (
    Array.isArray(value) &&
    value.every((item) => {
      if (!item || typeof item !== "object") return false;
      return typeof (item as { txid?: unknown }).txid === "string";
    })
  );
}

function isTxDetails(value: unknown): value is TxDetails {
  if (!value || typeof value !== "object") return false;
  const outputs = (value as { outputs?: unknown }).outputs;
  return outputs === undefined || Array.isArray(outputs);
}

async function haskoin(path: string): Promise<unknown> {
  const response = await fetch(`${HASKOIN}${path}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Explorer returned ${response.status}`);
  return response.json() as Promise<unknown>;
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const address = url.searchParams.get("address")?.trim() ?? "";
  const txid = url.searchParams.get("txid")?.trim() ?? "";
  if (!address.startsWith("bitcoincash:") || address.includes("/") || address.includes("?")) {
    return NextResponse.json({ error: "mainnet cashaddr required" }, { status: 400 });
  }

  try {
    if (txid !== "") {
      if (!/^[0-9a-fA-F]{64}$/.test(txid)) {
        return NextResponse.json({ error: "txid required" }, { status: 400 });
      }
      const body = await haskoin(`/transaction/${txid}`);
      if (!isTxDetails(body) || typeof body.txid !== "string") {
        return NextResponse.json({ error: "explorer unavailable" }, { status: 502 });
      }
      const amountSats = (body.outputs ?? []).reduce((sum, output) => {
        if (output.address?.toLowerCase() !== address.toLowerCase()) return sum;
        return sum + (typeof output.value === "number" ? output.value : 0);
      }, 0);
      return NextResponse.json({ txid: body.txid, amountSats });
    }

    const body = await haskoin(`/address/${encodeURIComponent(address)}/transactions?limit=10`);
    if (!isTxRefList(body)) {
      return NextResponse.json({ error: "explorer unavailable" }, { status: 502 });
    }
    return NextResponse.json({ txids: body.map((item) => item.txid) });
  } catch {
    return NextResponse.json({ error: "explorer unavailable" }, { status: 502 });
  }
}
