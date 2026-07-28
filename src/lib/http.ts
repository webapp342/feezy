import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function jsonError(
  message: string,
  status = 400,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json(
    { ok: false, error: message, ...extra },
    { status },
  );
}

export function shortWallet(wallet: string): string {
  if (wallet.length < 10) return wallet;
  return `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
}
