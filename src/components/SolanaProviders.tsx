"use client";

import { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";

const rpc =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  "https://api.mainnet-beta.solana.com";

export function SolanaProviders({ children }: { children: React.ReactNode }) {
  // Explicit adapters: Wallet Standard alone is empty on mobile Safari/Chrome
  // (no extension). Phantom/Solflare adapters enable iOS browse deep-links +
  // Solflare Loadable SDK; Wallet Standard still auto-adds MetaMask Solana etc.
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    [],
  );

  // autoConnect on mobile can fire connect without a user gesture and then
  // fall through to install / App Store redirects. Connect only on tap.
  return (
    <ConnectionProvider endpoint={rpc}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
