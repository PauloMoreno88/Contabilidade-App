import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { CheckoutShell } from "@/components/checkout/CheckoutShell";

export const metadata: Metadata = { title: "Contratar | Exactra Contabilidade", robots: { index: false, follow: false } };

export default function CheckoutPage() {
  return (
    <CheckoutShell>
      <Suspense>
        <CheckoutForm />
      </Suspense>
    </CheckoutShell>
  );
}
