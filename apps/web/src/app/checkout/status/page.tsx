import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutShell } from "@/components/checkout/CheckoutShell";
import { PaymentStatus } from "@/components/checkout/PaymentStatus";

export const metadata: Metadata = { title: "Pagamento | Exactra Contabilidade", robots: { index: false } };

/** Stripe success_url: /checkout/status?contract={id}&token={statusToken} */
export default function PaymentStatusPage() {
  return (
    <CheckoutShell>
      <Suspense>
        <PaymentStatus />
      </Suspense>
    </CheckoutShell>
  );
}
