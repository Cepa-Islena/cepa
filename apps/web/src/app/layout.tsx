import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@/components/ui-polish.css";

export const metadata: Metadata = {
  title: "Cepa Isleña | Jugos verdes y shots",
  description: "Jugos verdes y shots 100% naturales, cold pressed en SJ, PR.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://cepaislena.com"),
  openGraph: {
    title: "Cepa Isleña",
    description: "Jugos verdes y shots hechos con frutas, manos y mucha intención.",
    images: ["/brand/corillo-street.png"],
    url: "/",
    siteName: "Cepa Isleña",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F4F2E9",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
