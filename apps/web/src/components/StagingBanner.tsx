import { FlaskConical } from "lucide-react";
import { IS_STAGING, stagingCopy } from "@/config/env";

/** Fixed, discreet notice on every page of the test environment. Renders nothing in production. */
export function StagingBanner() {
  if (!IS_STAGING) return null;
  return (
    <p
      role="note"
      className="pointer-events-none fixed bottom-4 left-4 z-[60] flex max-w-[calc(100%-6.5rem)] items-center gap-2 rounded-full bg-ink/90 px-3.5 py-2 text-[0.78rem] font-medium text-white shadow-lg backdrop-blur sm:bottom-6 sm:left-6"
    >
      <FlaskConical size={14} className="shrink-0 text-amber-300" aria-hidden="true" />
      {stagingCopy.banner}
    </p>
  );
}
