import { Suspense } from "react";
import { ActivateForm } from "@/components/auth/ActivateForm";

/** Invite e-mail link: /entrar/ativar?token= */
export default function ActivatePage() {
  return (
    <Suspense>
      <ActivateForm />
    </Suspense>
  );
}
