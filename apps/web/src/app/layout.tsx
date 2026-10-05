import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { StagingBanner } from "@/components/StagingBanner";
import { IS_STAGING, SITE_URL } from "@/config/env";
import { seo } from "@/config/site";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
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
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <StagingBanner />
      </body>
    </html>
  );
}
