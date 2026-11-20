import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/landing/Brand";
import { checkoutCopy } from "@/config/checkout";

/** Minimal chrome for the checkout flow: no nav, so the visitor stays on task. */
export function CheckoutShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-line bg-bg">
        <div className="container-x flex h-[68px] items-center justify-between">
          <Brand />
          <Link href="/" className="flex items-center gap-1.5 text-[0.88rem] text-muted hover:text-ink">
            <ArrowLeft size={16} aria-hidden="true" />
            {checkoutCopy.back}
          </Link>
        </div>
      </header>
      <main className="container-x py-10 md:py-14">{children}</main>
    </>
  );
}
