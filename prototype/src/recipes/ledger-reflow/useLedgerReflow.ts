'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';
import { connectLedgerReflow, type ReflowOptions } from './reflow-controller';

/** Stable keys describe actual DOM order. Call capture before every data update. */
export function useLedgerReflow(itemKeys: readonly string[], { duration, maxDistance, motion }: ReflowOptions = {}) {
  const ref = useRef<HTMLUListElement>(null);
  const controller = useRef<ReturnType<typeof connectLedgerReflow> | null>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const instance = connectLedgerReflow(ref.current, { duration, maxDistance, motion });
    controller.current = instance;
    return () => { instance.destroy(); controller.current = null; };
  }, [duration, maxDistance, motion]);
  useLayoutEffect(() => { controller.current?.commit(); });
  // Serialize to make the data contract visible to callers, without replacing keyed DOM nodes.
  const keys = JSON.stringify(itemKeys);
  const capture = useCallback(() => { controller.current?.capture(); }, [keys]);
  return { ref, capture };
}
