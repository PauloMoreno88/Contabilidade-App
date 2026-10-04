import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/admin/PasswordReset";

/** Better Auth reset link target: ?token=... or ?error=INVALID_TOKEN */
export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
