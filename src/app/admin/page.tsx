import type { Metadata } from "next";
import { AdminShell } from "@/components/AdminShell";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Admin — $${BRAND.symbol}`,
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminShell />;
}
