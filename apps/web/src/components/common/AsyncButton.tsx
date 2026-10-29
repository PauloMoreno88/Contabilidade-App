"use client";

import { useRef, useState, type ComponentProps, type MouseEvent } from "react";
import { feedbackCopy } from "@/config/feedback";

/** Click actions without an existing pending state; forms keep their own state. */
export function AsyncButton({ onClick, disabled, children, ...props }: Omit<ComponentProps<"button">, "onClick"> & { onClick: (event: MouseEvent<HTMLButtonElement>) => Promise<unknown> }) {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  return (
    <button
      {...props}
      disabled={disabled || busy}
      aria-busy={busy}
      onClick={async (event) => {
        if (running.current) return;
        running.current = true;
        setBusy(true);
        try {
          await onClick(event);
        } finally {
          running.current = false;
          setBusy(false);
        }
      }}
    >
      {children}
      {busy && <span role="status" className="sr-only">{feedbackCopy.working}</span>}
    </button>
  );
}
