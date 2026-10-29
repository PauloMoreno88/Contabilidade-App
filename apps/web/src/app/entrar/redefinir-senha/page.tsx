import { Loading } from "@/components/common/Loading";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/PasswordReset";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
