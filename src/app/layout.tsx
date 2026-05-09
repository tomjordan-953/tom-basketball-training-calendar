import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "CourtSight AI";

export const metadata: Metadata = {
  title: `${APP_NAME} · NBA player projections`,
  description:
    "NBA player performance dashboard with formula-based next-game projections, recent form, and explainable factor breakdowns. Analysis only — not betting advice.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
