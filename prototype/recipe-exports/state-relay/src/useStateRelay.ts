'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { createStateRelay } from './createStateRelay';

export function useStateRelay(initialMessage = '') {
  const [controller] = useState(() => createStateRelay(initialMessage));
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);

  useEffect(() => {
    // cancel is reusable: Strict Mode's setup/cleanup/setup keeps this instance usable.
    // External operations must honor AbortSignal where their API supports it.
    return () => { controller.cancel(); };
  }, [controller]);

  return { ...snapshot, controller };
}
