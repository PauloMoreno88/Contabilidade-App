import type { Metadata } from "next";
import { Figtree, Geist_Mono, Source_Serif_4 } from "next/font/google";
import { StagingBanner } from "@/components/StagingBanner";
import { IS_STAGING, SITE_URL } from "@/config/env";
import { seo } from "@/config/site";
import "./globals.css";

const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
const sourceSerif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"], weight: ["500", "600", "700"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  icons: { icon: "/trace.svg" },
  metadataBase: new URL(SITE_URL),
  // Test environment: never indexed. Pages that set their own robots (admin, checkout) are noindex,nofollow too.
  ...(IS_STAGING && { robots: { index: false, follow: false } }),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Font variables on <html>: the Tailwind theme reads them at :root.
    <html lang="pt-BR" className={`${figtree.variable} ${sourceSerif.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        {children}
        <StagingBanner />
      </body>
    </html>
  );
}
