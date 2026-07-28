import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { getEnv } from "./env";

export const SESSION_COOKIE = "cfs_session";
const AUTH_MESSAGE_PREFIX = "Sign in to Creator Fee XP\nNonce: ";

function secretKey() {
  return new TextEncoder().encode(getEnv().SESSION_SECRET);
}

export type SessionPayload = {
  sub: string; // user uuid
  wallet: string;
};

export function buildAuthMessage(nonce: string): string {
  return `${AUTH_MESSAGE_PREFIX}${nonce}`;
}

export function verifyWalletSignature(params: {
  walletAddress: string;
  message: string;
  signatureBase58: string;
}): boolean {
  try {
    const pubkey = new PublicKey(params.walletAddress);
    const messageBytes = new TextEncoder().encode(params.message);
    const signature = bs58.decode(params.signatureBase58);
    return nacl.sign.detached.verify(
      messageBytes,
      signature,
      pubkey.toBytes(),
    );
  } catch {
    return false;
  }
}

export async function createSessionToken(
  payload: SessionPayload,
): Promise<string> {
  return new SignJWT({ wallet: payload.wallet })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function readSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const wallet = payload.wallet;
    const sub = payload.sub;
    if (typeof wallet !== "string" || typeof sub !== "string") return null;
    return { sub, wallet };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}
