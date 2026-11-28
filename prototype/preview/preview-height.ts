/** RESIZE heights the parent accepts: whole pixels within the protocol range 120–2400. */
export function previewHeight(value: number | undefined) {
  return Math.max(120, Math.min(2400, Math.ceil(typeof value === 'number' && Number.isFinite(value) ? value : 440)));
}

/**
 * Sends the demo height only when it changes. The reading is a synchronous layout query, so it can run from
 * message handlers, layout effects and mutation callbacks: Chrome pauses animation frames and ResizeObserver
 * in an off-screen cross-origin iframe, and a height reported only from those callbacks arrives when the
 * visitor scrolls to the demo — the page below then jumps.
 */
export function heightReporter(read: () => number | undefined, send: (height: number) => void) {
  let last = 0;
  return () => {
    const height = previewHeight(read());
    if (height !== last) { last = height; send(height); }
  };
}
