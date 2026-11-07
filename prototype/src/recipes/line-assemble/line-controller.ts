export interface LineOptions {
  duration?: number;
  lineDelay?: number;
  once?: boolean;
  motion?: 'off' | 'subtle' | 'expressive';
}

const bounded = (value: number, fallback: number, max: number) => Number.isFinite(value) ? Math.round(Math.max(0, Math.min(max, value))) : fallback;
export function normalizeLineOptions({ duration = 320, lineDelay = 45, once = true, motion = 'subtle' }: LineOptions = {}) {
  return { duration: bounded(duration, 320, 480), lineDelay: bounded(lineDelay, 45, 80), once, motion };
}

/** Delays are part of the total budget, even for a long translated heading. */
export function lineTiming(count: number, duration: number, requestedDelay: number) {
  const lines = Math.max(1, Math.floor(count));
  const delay = lines <= 1 ? 0 : Math.min(requestedDelay, Math.floor(duration / (lines * 2)));
  return { delay, duration: Math.max(0, duration - delay * (lines - 1)) };
}

/** The real heading remains the only text. No clones, hidden SSR text or permanent styles. */
export function connectLineAssemble(element: HTMLElement, options: LineOptions = {}) {
  const config = normalizeLineOptions(options);
  const view = element.ownerDocument.defaultView;
  const previous = element.getAttribute('data-line-state');
  const animations = new Set<Animation>();
  let observer: IntersectionObserver | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let media: MediaQueryList | undefined;
  let disposed = false;
  let seen = false;
  let inside = false;
  let fontsReady = element.ownerDocument.fonts?.status !== 'loading';
  const state = (value: string) => { if (!disposed) element.setAttribute('data-line-state', value); };
  const stop = () => {
    for (const animation of animations) { try { animation.cancel(); } catch { /* Resting text stays visible. */ } }
    animations.clear();
    state('settled');
  };
  const disabled = () => config.motion === 'off' || config.duration === 0 || media?.matches || !fontsReady;
  const play = (requested = false) => {
    if (disposed || (!requested && seen && config.once)) return;
    if (disabled()) { if (!requested) seen = true; return; }
    seen = true;
    stop();
    try {
      const words = Array.from(element.querySelectorAll<HTMLElement>('[data-line-word]'));
      if (!words.length || words.some(word => typeof word.animate !== 'function')) return;
      const tops: number[] = [];
      const lineNumbers = words.map(word => {
        const rect = word.getBoundingClientRect();
        if (!Number.isFinite(rect.top) || !rect.width || !rect.height) throw new Error('Text is not measurable');
        let line = tops.findIndex(top => Math.abs(top - rect.top) < 2);
        if (line < 0) { line = tops.length; tops.push(rect.top); }
        return line;
      });
      const timing = lineTiming(tops.length, config.duration, config.lineDelay);
      words.forEach((word, index) => {
        const animation = word.animate([
          { clipPath: 'inset(0 0 85% 0)', transform: `translateY(${config.motion === 'expressive' ? 12 : 6}px)` },
          { clipPath: 'inset(0 0 0 0)', transform: 'translateY(0)' },
        ], { duration: timing.duration, delay: timing.delay * lineNumbers[index], easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
        animations.add(animation);
        void animation.finished.then(() => {
          if (disposed || !animations.delete(animation)) return;
          if (!animations.size) state('settled');
        }, () => { if (!disposed) { animations.delete(animation); if (!animations.size) state('settled'); } });
      });
      state('running');
    } catch { stop(); }
  };
  const resize = () => { seen = true; stop(); };
  const reduce = () => { if (media?.matches) { seen = true; stop(); } };
  const fontChange = () => { fontsReady = true; seen = true; stop(); };
  state('visible');
  try {
    media = view?.matchMedia?.('(prefers-reduced-motion: reduce)');
    // Text already visible at initialization must not disappear again.
    const rect = element.getBoundingClientRect();
    let visibleTop = Math.max(0, rect.top);
    let visibleBottom = Math.min(view?.innerHeight ?? 0, rect.bottom);
    let visibleLeft = Math.max(0, rect.left);
    let visibleRight = Math.min(view?.innerWidth ?? Infinity, rect.right);
    let parent = element.parentElement;
    while (parent && view?.getComputedStyle) {
      const style = view.getComputedStyle(parent);
      const bounds = parent.getBoundingClientRect();
      if (/(auto|scroll|hidden|clip)/u.test(style.overflowY)) { visibleTop = Math.max(visibleTop, bounds.top); visibleBottom = Math.min(visibleBottom, bounds.bottom); }
      if (/(auto|scroll|hidden|clip)/u.test(style.overflowX)) { visibleLeft = Math.max(visibleLeft, bounds.left); visibleRight = Math.min(visibleRight, bounds.right); }
      parent = parent.parentElement;
    }
    inside = visibleBottom > visibleTop && visibleRight > visibleLeft;
    seen = inside;
    if (view?.IntersectionObserver) {
      observer = new view.IntersectionObserver(entries => {
        const entry = entries.find(entry => entry.target === element);
        if (!entry || disposed) return;
        if (entry.isIntersecting && !inside) play();
        if (!entry.isIntersecting) stop();
        inside = entry.isIntersecting;
      }, { threshold: .15 });
      observer.observe(element);
    }
    if (view?.ResizeObserver) {
      let first = true;
      resizeObserver = new view.ResizeObserver(() => { if (first) first = false; else resize(); });
      resizeObserver.observe(element);
    }
    view?.addEventListener('resize', resize);
    media?.addEventListener('change', reduce);
    element.ownerDocument.fonts?.addEventListener('loadingdone', fontChange);
    element.ownerDocument.fonts?.addEventListener('loadingerror', fontChange);
  } catch { stop(); }
  return {
    replay: () => play(true),
    destroy() {
      if (disposed) return;
      stop(); disposed = true;
      observer?.disconnect(); resizeObserver?.disconnect();
      view?.removeEventListener('resize', resize);
      media?.removeEventListener('change', reduce);
      element.ownerDocument.fonts?.removeEventListener('loadingdone', fontChange);
      element.ownerDocument.fonts?.removeEventListener('loadingerror', fontChange);
      if (previous === null) element.removeAttribute('data-line-state'); else element.setAttribute('data-line-state', previous);
    },
  };
}
