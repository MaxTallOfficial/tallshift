export interface ReflowOptions { duration?: number; maxDistance?: number; motion?: 'off' | 'subtle' | 'expressive' }
const bounded = (value: number, fallback: number, max: number) => Number.isFinite(value) ? Math.round(Math.max(0, Math.min(max, value))) : fallback;
export function normalizeReflowOptions({ duration = 240, maxDistance = 120, motion = 'subtle' }: ReflowOptions = {}) {
  return { duration: bounded(duration, 240, 480), maxDistance: bounded(maxDistance, 120, 160), motion };
}

export function boundedTranslation(x: number, y: number, maxDistance: number) {
  const distance = Math.hypot(x, y);
  const ratio = distance > maxDistance && distance > 0 ? maxDistance / distance : 1;
  return { x: x * ratio, y: y * ratio };
}

interface Position { element: HTMLElement; rect: DOMRect }
interface Snapshot { positions: Map<string, Position>; focus: Element | null; focusKey?: string; scroll?: HTMLElement; anchorKey?: string; anchorTop?: number }

/** Capture immediately before the host changes data; commit immediately after its DOM update. */
export function connectLedgerReflow(root: HTMLElement, options: ReflowOptions = {}) {
  const config = normalizeReflowOptions(options);
  const document = root.ownerDocument;
  const view = document.defaultView;
  const animations = new Set<Animation>();
  let snapshot: Snapshot | undefined;
  let disposed = false;
  let media: MediaQueryList | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let expectedSize = root.getBoundingClientRect();
  const items = () => Array.from(root.children).filter((element): element is HTMLElement => element.nodeType === 1 && element.hasAttribute('data-reflow-key'));
  const positions = () => {
    const result = new Map<string, Position>();
    for (const element of items()) {
      const key = element.getAttribute('data-reflow-key')!;
      if (result.has(key)) throw new Error('Stable list keys must be unique');
      result.set(key, { element, rect: element.getBoundingClientRect() });
    }
    return result;
  };
  const stop = () => {
    for (const animation of animations) { try { animation.cancel(); } catch { /* The DOM already has the final data. */ } }
    animations.clear();
  };
  const cancel = () => { stop(); snapshot = undefined; };
  const scrollParent = () => {
    let parent = root.parentElement;
    while (parent && view) {
      const style = view.getComputedStyle(parent);
      if (/(auto|scroll)/u.test(style.overflowY) && parent.scrollHeight > parent.clientHeight) return parent;
      parent = parent.parentElement;
    }
    return document.scrollingElement as HTMLElement | null;
  };
  try {
    media = view?.matchMedia?.('(prefers-reduced-motion: reduce)');
    media?.addEventListener('change', cancel);
    view?.addEventListener('resize', cancel);
    root.addEventListener('focusin', stop);
    if (view?.ResizeObserver) {
      resizeObserver = new view.ResizeObserver(() => {
        const size = root.getBoundingClientRect();
        if (Math.abs(size.width - expectedSize.width) > 1 || Math.abs(size.height - expectedSize.height) > 1) cancel();
        expectedSize = size;
      });
      resizeObserver.observe(root);
    }
  } catch { /* Missing observers leave direct data updates functional. */ }
  return {
    capture() {
      if (disposed) return;
      try {
        // Measure the current visual position before cancelling an interrupted effect.
        const before = positions();
        const focus = document.activeElement;
        const focusKey = [...before].find(([, position]) => position.element.contains(focus))?.[0];
        const scroll = scrollParent() ?? undefined;
        const bounds = scroll === document.scrollingElement ? { top: 0, bottom: view?.innerHeight ?? 0 } : scroll?.getBoundingClientRect();
        const rootRect = root.getBoundingClientRect();
        const clipped = bounds && (rootRect.top < bounds.top || rootRect.bottom > bounds.bottom);
        const anchor = clipped ? (focusKey ? [focusKey, before.get(focusKey)!] as const : [...before].find(([, position]) => position.rect.top >= bounds.top && position.rect.bottom <= bounds.bottom)) : undefined;
        snapshot = { positions: before, focus, focusKey, scroll, anchorKey: anchor?.[0], anchorTop: anchor?.[1].rect.top };
        stop();
      } catch { cancel(); }
    },
    commit() {
      const before = snapshot;
      snapshot = undefined;
      if (disposed || !before) return;
      try {
        let after = positions();
        expectedSize = root.getBoundingClientRect();
        // Restore only the surviving visible anchor, never an arbitrary page position.
        if (before.anchorKey && before.scroll && before.anchorTop !== undefined) {
          const anchor = after.get(before.anchorKey);
          if (anchor) {
            before.scroll.scrollTop += anchor.rect.top - before.anchorTop;
            after = positions();
          }
        }
        // React preserves focus for keyed survivors. A removed focused row gets a local fallback.
        if (before.focusKey && before.focus && !document.contains(before.focus) && (document.activeElement === document.body || document.activeElement === null)) {
          const oldKeys = [...before.positions.keys()];
          const oldIndex = oldKeys.indexOf(before.focusKey);
          const remaining = [...after.values()];
          (remaining[Math.min(oldIndex, remaining.length - 1)]?.element ?? root).focus({ preventScroll: true });
        }
        if (config.motion === 'off' || config.duration === 0 || media?.matches) return;
        const limit = config.motion === 'expressive' ? config.maxDistance : Math.min(config.maxDistance, 64);
        for (const [key, position] of after) {
          const layer = position.element.querySelector<HTMLElement>('[data-reflow-layer]');
          if (!layer || typeof layer.animate !== 'function') continue;
          const old = before.positions.get(key);
          const delta = old ? boundedTranslation(old.rect.left - position.rect.left, old.rect.top - position.rect.top, limit) : { x: 0, y: 0 };
          if (old && Math.abs(delta.x) + Math.abs(delta.y) < .5) continue;
          const animation = layer.animate(old ? [
            { transform: `translate(${delta.x}px, ${delta.y}px)` }, { transform: 'translate(0, 0)' },
          ] : [{ opacity: .6 }, { opacity: 1 }], { duration: config.duration, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'none' });
          animations.add(animation);
          void animation.finished.then(() => { animations.delete(animation); }, () => { animations.delete(animation); });
        }
      } catch { stop(); }
    },
    destroy() {
      if (disposed) return;
      cancel(); disposed = true;
      media?.removeEventListener('change', cancel);
      view?.removeEventListener('resize', cancel);
      root.removeEventListener('focusin', stop);
      resizeObserver?.disconnect();
    },
  };
}
