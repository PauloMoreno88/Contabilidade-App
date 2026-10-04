"use client";

import { useEffect, useState } from "react";

/** Runs `load` when deps change; ignores stale responses. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data?: T; error?: boolean }>({});
  useEffect(() => {
    let live = true;
    load().then(
      (data) => live && setState({ data }),
      () => live && setState({ error: true }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
