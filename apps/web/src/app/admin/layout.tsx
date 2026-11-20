import type { Metadata } from "next";

export const metadata: Metadata = { title: "Painel | Exactra", robots: { index: false, follow: false } };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
