import { Loading } from "@/components/common/Loading";
import { Suspense } from "react";
import { ActivateForm } from "@/components/auth/ActivateForm";

/** Invite e-mail link: /entrar/ativar?token= */
export default function ActivatePage() {
  return (
    <Suspense fallback={<Loading />}>
      <ActivateForm />
    </Suspense>
  );
}
