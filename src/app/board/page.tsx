import type { Metadata } from "next";
import { BoardShell } from "@/components/BoardShell";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `XP Board — $${BRAND.symbol}`,
  description:
    "Live XP ranks for Feezy fee snapshots. Sync your bag, clear raids, climb the board.",
};

export default function BoardPage() {
  return <BoardShell />;
}
