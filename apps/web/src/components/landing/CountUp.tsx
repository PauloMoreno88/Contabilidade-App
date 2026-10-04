"use client";

import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { formatBRL } from "@/lib/format";

/** The page's one orchestrated moment: the hero estimate counts up on load. */
export function CountUp({ cents, durationS = 1.1 }: { cents: number; durationS?: number }) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(cents);

  useEffect(() => {
    if (reduced) return;
    const controls = animate(0, cents, { duration: durationS, ease: "easeOut", onUpdate: setValue });
    return () => controls.stop();
  }, [cents, durationS, reduced]);

  return <>{formatBRL(value)}</>;
}
