import { Redirect } from "@/components/common/Redirect";

/** Old address: sign-in moved to /entrar (one entrance for customers and the team). */
export default function Page() {
  return <Redirect to="/entrar" />;
}
