"use client";

import { useCallback, useEffect, useState } from "react";

/** Runs `load` when deps change (or on reload()); ignores stale responses. Keeps the last data while reloading. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data?: T; error?: boolean }>({});
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    load().then(
      (data) => live && setState({ data }),
      () => live && setState((s) => ({ data: s.data, error: true })),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
