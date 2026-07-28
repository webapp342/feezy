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
  applicationName: BRAND.name,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon.png", type: "image/png", sizes: "48x48" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: `$${BRAND.symbol} — ${BRAND.name}`,
    description: BRAND.tagline,
    siteName: BRAND.name,
    images: [
      {
        url: BRAND.images.stickers.logo,
        width: 480,
        height: 480,
        alt: BRAND.name,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: `$${BRAND.symbol} — ${BRAND.name}`,
    description: BRAND.tagline,
    images: [BRAND.images.stickers.logo],
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
