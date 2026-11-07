export interface RevealOptions {
  once?: boolean;
  distance?: number;
  duration?: number;
  motion?: 'off' | 'subtle' | 'expressive';
}

export function normalizeRevealOptions({ once = true, distance = 16, duration = 240, motion = 'subtle' }: RevealOptions = {}) {
  return {
    once,
    distance: Number.isFinite(distance) ? Math.max(0, Math.min(24, distance)) : 16,
    duration: Number.isFinite(duration) ? Math.round(Math.max(0, Math.min(600, duration))) : 240,
    motion,
  };
}

/** The resting DOM is always visible. Only this instance's temporary animation is owned here. */
export function connectContentReveal(element: HTMLElement, options: RevealOptions = {}): () => void {
  const config = normalizeRevealOptions(options);
  const view = element.ownerDocument.defaultView;
  const previousState = element.getAttribute('data-reveal-state');
  let disposed = false;
  let seen = false;
  let visible = false;
  let animation: Animation | undefined;
  let observer: IntersectionObserver | undefined;
  let media: MediaQueryList | undefined;
  const state = (value: string) => { if (!disposed) element.setAttribute('data-reveal-state', value); };
  const stop = (value = 'settled') => {
    const previous = animation;
    animation = undefined;
    if (previous) { try { previous.cancel(); } catch { /* The visible fallback does not depend on cancellation. */ } }
    state(value);
  };
  const isReduced = () => media?.matches ?? false;
  const disabled = () => config.motion === 'off' || config.duration === 0 || isReduced();
  function enter() {
    if (disposed || disabled() || (config.once && seen)) { if (disabled()) stop('static'); return; }
    seen = true;
    if (element.contains(element.ownerDocument.activeElement)) { stop('static'); return; }
    stop();
    try {
      const distance = config.motion === 'expressive' ? config.distance : Math.min(config.distance, 12);
      const current = element.animate([
        { opacity: .65, transform: `translateY(${distance}px)` },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: config.duration, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'none' });
      animation = current;
      state('running');
      // Cancelled animations reject finished; never create an unhandled rejection.
      void current.finished.then(() => {
        if (disposed || animation !== current) return;
        animation = undefined;
        state('settled');
        if (config.once) observer?.disconnect();
      }, () => { if (!disposed && animation === current) { animation = undefined; state('settled'); } });
    } catch { stop('static'); if (config.once) observer?.disconnect(); }
  }
  const resize = () => stop('static');
  const focus = () => stop('static');
  const motion = () => { if (isReduced()) stop('static'); else if (visible && !seen) enter(); };
  state('ready');
  try {
    media = view?.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!view?.IntersectionObserver || typeof element.animate !== 'function' || config.motion === 'off' || config.duration === 0) {
      state('static');
      return () => { disposed = true; if (previousState === null) element.removeAttribute('data-reveal-state'); else element.setAttribute('data-reveal-state', previousState); };
    }
    if (isReduced()) state('static');
    observer = new view.IntersectionObserver(entries => {
      const entry = entries.find(entry => entry.target === element);
      if (!entry || disposed) return;
      const entered = entry.isIntersecting;
      if (entered && !visible) enter();
      else if (!entered) stop(seen ? 'settled' : 'ready');
      visible = entered;
    }, { threshold: .1 });
    observer.observe(element);
    media?.addEventListener('change', motion);
    view.addEventListener('resize', resize);
    element.addEventListener('focusin', focus);
  } catch {
    observer?.disconnect();
    stop('static');
  }
  return () => {
    if (disposed) return;
    stop();
    disposed = true;
    observer?.disconnect();
    media?.removeEventListener('change', motion);
    view?.removeEventListener('resize', resize);
    element.removeEventListener('focusin', focus);
    if (previousState === null) element.removeAttribute('data-reveal-state');
    else element.setAttribute('data-reveal-state', previousState);
  };
}
