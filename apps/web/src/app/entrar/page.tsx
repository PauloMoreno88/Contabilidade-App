import { Loading } from "@/components/common/Loading";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth/SignInForm";

/** One entrance for customers (/app) and the team (/admin): the role decides where it lands. */
export default function SignInPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SignInForm />
    </Suspense>
  );
}
