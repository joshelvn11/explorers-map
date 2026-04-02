import type { Metadata } from "next";

import { SiteHeader } from "../components/site-header";
import { buildMetadata, getMetadataBase } from "../lib/metadata";
import { siteName } from "../lib/routes";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  ...buildMetadata({
    title: siteName,
    description:
      "Discover standout outdoor places through calm, visual country, region, destination, and listing pages.",
  }),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[radial-gradient(circle_at_top,#fdf7ef,transparent_36%),linear-gradient(180deg,#f6f0e7_0%,#f8f4ee_38%,#fcfaf7_100%)] text-stone-950">
        <div className="relative flex min-h-screen flex-col">
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <footer className="border-t border-stone-200/80 bg-white/70">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-stone-600 sm:px-6 lg:px-8">
              <p className="font-serif text-lg text-stone-900">{siteName}</p>
              <p>Curated country, region, destination, and listing pages for outdoor discovery.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
