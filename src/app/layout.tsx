import type { Metadata } from "next";
import { Bungee, Outfit, IBM_Plex_Mono } from "next/font/google";
import { SolanaProviders } from "@/components/SolanaProviders";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const display = Bungee({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bungee",
});

const sans = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-outfit",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  title: `$${BRAND.symbol} — ${BRAND.name}`,
  description: BRAND.tagline,
  openGraph: {
    title: `$${BRAND.symbol} — ${BRAND.name}`,
    description: BRAND.tagline,
    images: [BRAND.images.mascot],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full`}
    >
      <body
        className="min-h-full"
        style={{ fontFamily: "var(--font-outfit), var(--sans)" }}
      >
        <SolanaProviders>{children}</SolanaProviders>
      </body>
    </html>
  );
}
