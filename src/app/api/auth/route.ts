import { z } from "zod";
import {
  buildAuthMessage,
  createSessionToken,
  sessionCookieOptions,
  verifyWalletSignature,
} from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { getRedis } from "@/lib/redis";
import { ensureUser } from "@/lib/sync";
import { PublicKey } from "@solana/web3.js";

export const runtime = "nodejs";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("nonce"), wallet: z.string().min(32).max(64) }),
  z.object({
    action: z.literal("verify"),
    wallet: z.string().min(32).max(64),
    signature: z.string().min(64),
    nonce: z.string().min(8).max(128),
    referrer: z.string().min(32).max(64).optional().nullable(),
  }),
]);

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return jsonError("Invalid request body", 400);
    }

    const data = parsed.data;

    try {
      new PublicKey(data.wallet);
    } catch {
      return jsonError("Invalid wallet address", 400);
    }

    if (data.action === "nonce") {
      const nonce = crypto.randomUUID();
      const redis = getRedis();
      await redis.set(`auth:nonce:${data.wallet}`, nonce, { ex: 300 });
      const message = buildAuthMessage(nonce);
      return jsonOk({ nonce, message });
    }

    const redis = getRedis();
    const stored = await redis.get<string>(`auth:nonce:${data.wallet}`);
    if (!stored || stored !== data.nonce) {
      return jsonError("Nonce expired or invalid. Request a new one.", 401);
    }

    const message = buildAuthMessage(data.nonce);
    const valid = verifyWalletSignature({
      walletAddress: data.wallet,
      message,
      signatureBase58: data.signature,
    });
    if (!valid) {
      return jsonError("Invalid signature", 401);
    }

    await redis.del(`auth:nonce:${data.wallet}`);

    const { userId, created } = await ensureUser({
      walletAddress: data.wallet,
      referrerWallet: data.referrer ?? null,
    });

    const token = await createSessionToken({
      sub: userId,
      wallet: data.wallet,
    });

    const res = jsonOk({
      wallet: data.wallet,
      userId,
      created,
    });
    res.cookies.set(sessionCookieOptions(token));
    return res;
  } catch (err) {
    console.error("[auth]", err);
    return jsonError("Authentication failed", 500);
  }
}

export async function DELETE() {
  const res = jsonOk({ loggedOut: true });
  res.cookies.set({
    name: "cfs_session",
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
