import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Workplace Mind Audit — Workplace Psychology Intelligence",
    template: "%s · Workplace Mind Audit",
  },
  description:
    "Measure the hidden workplace risks affecting wellbeing, performance, and retention. A B2B platform that turns organisational psychology into hard business metrics.",
  openGraph: {
    title: "Workplace Mind Audit",
    description:
      "Measure the hidden workplace risks affecting wellbeing, performance, and retention.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white">{children}</body>
    </html>
  );
}
