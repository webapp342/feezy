import { Connection, PublicKey } from "@solana/web3.js";
import { getEnv } from "./env";

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);
const TOKEN_2022_PROGRAM_ID = new PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
);

function connection(): Connection {
  return new Connection(getEnv().SOLANA_RPC_URL, "confirmed");
}

/**
 * Oldest on-chain activity (first signature blockTime).
 * Result should be cached in Postgres — scanning history is RPC-heavy.
 * Caps pagination so free RPC / serverless timeouts stay safe
 * (very active wallets may get a conservative lower-bound age).
 */
export async function fetchWalletFirstActivityAt(
  walletAddress: string,
): Promise<Date | null> {
  const conn = connection();
  const pubkey = new PublicKey(walletAddress);
  const MAX_PAGES = 5; // 5k sigs max — free RPC + UX; cached forever after first sync
  let before: string | undefined;
  let oldestBlockTime: number | null = null;

  for (let page = 0; page < MAX_PAGES; page++) {
    const sigs = await conn.getSignaturesForAddress(pubkey, {
      limit: 1000,
      ...(before ? { before } : {}),
    });
    if (sigs.length === 0) break;

    const last = sigs[sigs.length - 1];
    if (typeof last.blockTime === "number") {
      oldestBlockTime = last.blockTime;
    }

    if (sigs.length < 1000) break;
    before = last.signature;
  }

  if (oldestBlockTime == null) return null;
  return new Date(oldestBlockTime * 1000);
}

async function resolveTokenProgramId(
  conn: Connection,
  mint: PublicKey,
): Promise<PublicKey> {
  const info = await conn.getAccountInfo(mint, "confirmed");
  if (!info) {
    throw new Error("TOKEN_MINT_NOT_FOUND");
  }
  const owner = info.owner;
  if (owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID;
  if (owner.equals(TOKEN_PROGRAM_ID)) return TOKEN_PROGRAM_ID;
  // Fallback: try Token-2022 first (pump.fun style), then legacy
  return TOKEN_2022_PROGRAM_ID;
}

/**
 * Raw token amount (smallest units) for TOKEN_MINT owned by wallet.
 * Uses the mint's actual token program only (avoids double-counting
 * the same ATA when querying both Token + Token-2022).
 */
export async function fetchTokenBalanceRaw(
  walletAddress: string,
): Promise<bigint> {
  const { TOKEN_MINT } = getEnv();
  const owner = new PublicKey(walletAddress);
  const mint = new PublicKey(TOKEN_MINT);
  const conn = connection();
  const programId = await resolveTokenProgramId(conn, mint);

  const accounts = await conn.getParsedTokenAccountsByOwner(owner, {
    mint,
    programId,
  });

  // Dedupe by ATA address (defensive)
  const seen = new Set<string>();
  let total = 0n;
  for (const { pubkey, account } of accounts.value) {
    const key = pubkey.toBase58();
    if (seen.has(key)) continue;
    seen.add(key);
    const amount = account.data.parsed?.info?.tokenAmount?.amount;
    if (typeof amount === "string") {
      total += BigInt(amount);
    }
  }
  return total;
}

/** Read decimals from mint account when possible; else env TOKEN_DECIMALS. */
export async function fetchMintDecimals(): Promise<number> {
  const { TOKEN_MINT, TOKEN_DECIMALS } = getEnv();
  try {
    const conn = connection();
    const mint = new PublicKey(TOKEN_MINT);
    const info = await conn.getParsedAccountInfo(mint, "confirmed");
    const data = info.value?.data;
    if (data && typeof data === "object" && "parsed" in data) {
      const decimals = (data as { parsed?: { info?: { decimals?: number } } })
        .parsed?.info?.decimals;
      if (typeof decimals === "number") return decimals;
    }
  } catch {
    // fall through
  }
  return TOKEN_DECIMALS;
}

/** Human-readable balance using TOKEN_DECIMALS. */
export function rawToUiAmount(raw: bigint, decimals = getEnv().TOKEN_DECIMALS): number {
  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const frac = raw % base;
  return Number(whole) + Number(frac) / Number(base);
}

export function uiToRawApprox(ui: number): bigint {
  const decimals = getEnv().TOKEN_DECIMALS;
  return BigInt(Math.floor(ui * 10 ** decimals));
}

/** Native SOL balance (lamports → SOL). */
export async function fetchSolBalance(walletAddress: string): Promise<number> {
  const conn = connection();
  const lamports = await conn.getBalance(new PublicKey(walletAddress), "confirmed");
  return lamports / 1e9;
}

const PUMP_PROGRAM_ID = new PublicKey(
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
);
const PUMP_AMM_PROGRAM_ID = new PublicKey(
  "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
);
const NATIVE_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112",
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
);

/**
 * Unclaimed pump.fun creator earnings for a creator wallet (claimable SOL).
 * Matches OnlinePumpSdk.getCreatorVaultBalanceBothPrograms:
 * bonding-curve creator-vault lamports − rent, plus AMM WSOL vault.
 * Also checks fee-sharing shareholderUnclaimed when that system is used.
 */
export async function fetchCreatorUnclaimedFeesSol(
  creatorAddress: string,
): Promise<number> {
  const creator = new PublicKey(creatorAddress);
  const conn = connection();

  const [pumpVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("creator-vault"), creator.toBuffer()],
    PUMP_PROGRAM_ID,
  );
  const [ammAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("creator_vault"), creator.toBuffer()],
    PUMP_AMM_PROGRAM_ID,
  );
  const [ammAta] = PublicKey.findProgramAddressSync(
    [
      ammAuthority.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      NATIVE_MINT.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  const [vaultInfo, ammInfo, feeSharingSol] = await Promise.all([
    conn.getAccountInfo(pumpVault, "confirmed"),
    conn.getAccountInfo(ammAta, "confirmed"),
    fetchFeeSharingUnclaimedSol(creatorAddress).catch(() => 0),
  ]);

  let pumpClaimable = 0;
  if (vaultInfo) {
    const rent = await conn.getMinimumBalanceForRentExemption(
      vaultInfo.data.length,
    );
    pumpClaimable = Math.max(0, vaultInfo.lamports - rent) / 1e9;
  }

  let ammClaimable = 0;
  if (ammInfo && ammInfo.data.length >= 72) {
    // SPL token account: amount is u64 LE at offset 64
    const amount = ammInfo.data.readBigUInt64LE(64);
    ammClaimable = Number(amount) / 1e9;
  }

  const onChain = pumpClaimable + ammClaimable;
  return Math.max(onChain, feeSharingSol);
}

async function fetchFeeSharingUnclaimedSol(
  creatorAddress: string,
): Promise<number> {
  const res = await fetch(
    `https://swap-api.pump.fun/v1/fee-sharing/account/${creatorAddress}/totals`,
    {
      headers: {
        Accept: "application/json",
        Origin: "https://pump.fun",
        Referer: "https://pump.fun/",
      },
      cache: "no-store",
    },
  );
  if (!res.ok) return 0;
  const json = (await res.json()) as {
    shareholderUnclaimed?: { sol?: string; lamports?: string };
  };
  const sol = json.shareholderUnclaimed?.sol;
  if (typeof sol === "string" && sol.length > 0) {
    const n = Number(sol);
    if (Number.isFinite(n)) return n;
  }
  const lamports = json.shareholderUnclaimed?.lamports;
  if (typeof lamports === "string" && lamports.length > 0) {
    const n = Number(lamports);
    if (Number.isFinite(n)) return n / 1e9;
  }
  return 0;
}
