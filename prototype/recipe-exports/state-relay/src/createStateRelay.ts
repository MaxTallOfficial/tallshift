export type RelayState = 'idle' | 'pending' | 'success' | 'error';

export interface RelaySnapshot {
  readonly state: RelayState;
  readonly statusMessage: string;
  readonly requestId: number;
}

export interface RelayTicket {
  readonly requestId: number;
  readonly signal: AbortSignal;
}

export type RelayResult<T> =
  | { status: 'success'; value: T }
  | { status: 'error'; error: unknown }
  | { status: 'stale' };

/** Local state only. The host supplies the operation and its real outcome. */
export function createStateRelay(initialMessage = '') {
  const initial: RelaySnapshot = Object.freeze({ state: 'idle', statusMessage: initialMessage, requestId: 0 });
  let snapshot = initial;
  let sequence = 0;
  let active: AbortController | undefined;
  let destroyed = false;
  const listeners = new Set<() => void>();

  const publish = (state: RelayState, statusMessage: string) => {
    snapshot = Object.freeze({ state, statusMessage, requestId: sequence });
    for (const listener of listeners) listener();
  };

  const begin = (statusMessage = ''): RelayTicket => {
    if (destroyed) throw new Error('State Relay has been destroyed. Create a new controller.');
    // Invalidate before abort: an abort handler must not settle an older request.
    sequence += 1;
    const previous = active;
    active = new AbortController();
    previous?.abort();
    publish('pending', statusMessage);
    return Object.freeze({ requestId: sequence, signal: active.signal });
  };

  const settle = (ticket: RelayTicket, outcome: 'success' | 'error', statusMessage = '') => {
    if (destroyed || ticket.requestId !== sequence || ticket.signal.aborted || active?.signal !== ticket.signal) return false;
    active = undefined;
    publish(outcome, statusMessage);
    return true;
  };

  const reset = (statusMessage = initialMessage) => {
    if (destroyed) return;
    sequence += 1;
    const previous = active;
    active = undefined;
    previous?.abort();
    publish('idle', statusMessage);
  };

  async function run<T>(
    operation: (signal: AbortSignal) => T | PromiseLike<T>,
    messages: { pending?: string; success?: string; error?: string } = {},
  ): Promise<RelayResult<T>> {
    const ticket = begin(messages.pending);
    try {
      // No minimum duration or fake timer: real work starts immediately.
      const value = await operation(ticket.signal);
      return settle(ticket, 'success', messages.success) ? { status: 'success', value } : { status: 'stale' };
    } catch (error) {
      return settle(ticket, 'error', messages.error) ? { status: 'error', error } : { status: 'stale' };
    }
  }

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    subscribe(listener: () => void) {
      if (destroyed) return () => {};
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    begin,
    settle,
    run,
    reset,
    cancel: reset,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      sequence += 1;
      const previous = active;
      active = undefined;
      previous?.abort();
      listeners.clear();
    },
  };
}

export type StateRelayController = ReturnType<typeof createStateRelay>;
