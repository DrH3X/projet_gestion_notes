"use client";

import { useEffect, useRef, useState } from "react";
import type { SoapFault } from "@/types";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: SoapFault | null;
}

/**
 * Lightweight data-fetching hook for SOAP-backed reads.
 * Supports manual refetch + dependency re-fetch.
 *
 * `deps` is forwarded to the internal useEffect so callers can re-fetch when
 * filters change (e.g. [classe]). The fetcher itself is kept in a ref so the
 * effect identity is stable across renders.
 */
export function useAsync<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const refetchRef = useRef<() => void>(() => {});

  const run = () => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcherRef
      .current()
      .then((data) => {
        if (alive) setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (alive)
          setState({
            data: null,
            loading: false,
            error: (err as SoapFault) ?? {
              code: "ERREUR",
              message: "Erreur inconnue",
            },
          });
      });
    return () => {
      alive = false;
    };
  };
  refetchRef.current = run;

  // Re-run when deps change. The array-literal lint rule is satisfied by
  // forwarding the caller's deps array; react-hooks/exhaustive-deps is disabled
  // project-wide (the fetcher lives in a ref).
  useEffect(() => {
    const cancel = refetchRef.current();
    return cancel;
  }, deps);

  return { ...state, refetch: run };
}
