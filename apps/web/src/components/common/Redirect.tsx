"use client";

import { Loading } from "@/components/common/Loading";
import { useEffect } from "react";

/** Client-side redirect that keeps the query string (static export: no server redirects). */
export function Redirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(`${to}${window.location.search}`);
  }, [to]);
  return <Loading />;
}
