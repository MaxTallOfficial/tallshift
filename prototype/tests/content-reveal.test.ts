import test from 'node:test';
import assert from 'node:assert/strict';
import { connectContentReveal, normalizeRevealOptions } from '../src/recipes/content-reveal/reveal-controller.ts';

class CountedTarget extends EventTarget {
  listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
  override addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean) {
    if (listener) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type)!.add(listener); }
    super.addEventListener(type, listener, options);
  }
  override removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean) {
    if (listener) this.listeners.get(type)?.delete(listener);
    super.removeEventListener(type, listener, options);
  }
  get count() { return [...this.listeners.values()].reduce((total, listeners) => total + listeners.size, 0); }
}
class FakeAnimation {
  cancelled = 0;
  resolve!: (value: unknown) => void;
  reject!: (reason?: unknown) => void;
  finished = new Promise((resolve, reject) => { this.resolve = resolve; this.reject = reject; });
  cancel() { this.cancelled++; this.reject(new Error('cancelled')); }
  finish() { this.resolve(undefined); }
}
function fixture({ reduced = false, observerMissing = false, animateMissing = false, observerThrows = false, animateThrows = false }: { reduced?: boolean; observerMissing?: boolean; animateMissing?: boolean; observerThrows?: boolean; animateThrows?: boolean } = {}) {
  const observers: { notify: (inside: boolean) => void; disconnected: number }[] = [];
  const animations: { value: FakeAnimation; frames: Keyframe[]; options: KeyframeAnimationOptions }[] = [];
  const media = Object.assign(new CountedTarget(), { matches: reduced });
  const view = Object.assign(new CountedTarget(), {
    matchMedia: () => media,
    IntersectionObserver: observerMissing ? undefined : class {
      slot: (typeof observers)[number];
      constructor(callback: IntersectionObserverCallback) {
        if (observerThrows) throw new Error('observer unavailable');
        this.slot = { notify: inside => callback([{ target: element, isIntersecting: inside } as unknown as IntersectionObserverEntry], this as unknown as IntersectionObserver), disconnected: 0 };
        observers.push(this.slot);
      }
      observe() {}
      disconnect() { this.slot.disconnected++; }
    },
  });
  const attrs = new Map<string, string>();
  const child = {};
  const document = { defaultView: view, activeElement: null as unknown };
  const target = Object.assign(new CountedTarget(), {
    ownerDocument: document,
    contains: (node: unknown) => node === child,
    getAttribute: (name: string) => attrs.get(name) ?? null,
    setAttribute: (name: string, value: string) => { attrs.set(name, value); },
    removeAttribute: (name: string) => { attrs.delete(name); },
    animate: animateMissing ? undefined : (frames: Keyframe[], options: KeyframeAnimationOptions) => {
      if (animateThrows) throw new Error('animation unavailable');
      const value = new FakeAnimation(); animations.push({ value, frames, options }); return value;
    },
  });
  const element = target as unknown as HTMLElement;
  return { element, target, attrs, child, document, view, media, observers, animations, reduce(value: boolean) { media.matches = value; media.dispatchEvent(new Event('change')); } };
}

test('content reveal bounds normalize finite API values without hiding or delaying content', () => {
  assert.deepEqual(normalizeRevealOptions(), { once: true, distance: 16, duration: 240, motion: 'subtle' });
  assert.deepEqual(normalizeRevealOptions({ distance: 100, duration: 900 }), { once: true, distance: 24, duration: 600, motion: 'subtle' });
  assert.equal(normalizeRevealOptions({ duration: -1, distance: -1 }).duration, 0);
  assert.equal(normalizeRevealOptions({ duration: NaN, distance: Infinity }).distance, 16);
});

test('once entrance uses a temporary visible animation and ignores late work after cleanup', async () => {
  const f = fixture();
  f.attrs.set('data-reveal-state', 'host-value');
  const cleanup = connectContentReveal(f.element, { duration: 600, distance: 24, motion: 'expressive' });
  assert.equal(f.animations.length, 0, 'setup never animates or hides unentered content');
  f.observers[0].notify(true);
  assert.equal(f.animations.length, 1);
  assert.equal(f.animations[0].options.duration, 600);
  assert.equal(f.animations[0].options.fill, 'none');
  assert.ok(f.animations[0].frames.every(frame => Number(frame.opacity) > 0), 'content never becomes transparent');
  assert.equal(f.animations[0].frames[0].transform, 'translateY(24px)');
  f.animations[0].value.finish(); await Promise.resolve();
  assert.equal(f.attrs.get('data-reveal-state'), 'settled');
  assert.ok(f.observers[0].disconnected > 0);
  f.observers[0].notify(false); f.observers[0].notify(true);
  assert.equal(f.animations.length, 1, 'once does not replay');
  cleanup();
  assert.equal(f.attrs.get('data-reveal-state'), 'host-value');
  assert.equal(f.view.count + f.media.count + f.target.count, 0);
  f.observers[0].notify(true);
  assert.equal(f.attrs.get('data-reveal-state'), 'host-value');
});

test('repeat entrance cancels on exit and instance cleanup does not cancel another instance', async () => {
  const first = fixture(), second = fixture();
  const disposeFirst = connectContentReveal(first.element, { once: false });
  const disposeSecond = connectContentReveal(second.element, { once: false });
  first.observers[0].notify(true); second.observers[0].notify(true);
  first.observers[0].notify(false);
  assert.equal(first.animations[0].value.cancelled, 1);
  first.observers[0].notify(true);
  assert.equal(first.animations.length, 2);
  disposeFirst(); await Promise.resolve();
  assert.equal(first.animations[1].value.cancelled, 1);
  assert.equal(second.animations[0].value.cancelled, 0);
  assert.equal(first.view.count + first.media.count + first.target.count, 0);
  assert.equal(first.attrs.has('data-reveal-state'), false);
  disposeSecond(); await Promise.resolve();
  assert.equal(second.animations[0].value.cancelled, 1);
});

test('initial reduced motion stays subscribed and can enable a later entrance', async () => {
  const f = fixture({ reduced: true });
  const cleanup = connectContentReveal(f.element);
  assert.equal(f.media.count, 1);
  f.observers[0].notify(true);
  assert.equal(f.animations.length, 0);
  assert.equal(f.attrs.get('data-reveal-state'), 'static');
  f.reduce(false);
  assert.equal(f.animations.length, 1);
  f.reduce(true); await Promise.resolve();
  assert.equal(f.animations[0].value.cancelled, 1);
  assert.equal(f.attrs.get('data-reveal-state'), 'static');
  cleanup();
  assert.equal(f.media.count, 0);
});

test('focus already inside skips entrance, and new focus or resize cancels active motion', async () => {
  const focused = fixture(); focused.document.activeElement = focused.child;
  const disposeFocused = connectContentReveal(focused.element);
  focused.observers[0].notify(true);
  assert.equal(focused.animations.length, 0);
  assert.equal(focused.attrs.get('data-reveal-state'), 'static');
  disposeFocused();
  for (const reason of ['focusin', 'resize']) {
    const f = fixture(); const cleanup = connectContentReveal(f.element);
    f.observers[0].notify(true);
    (reason === 'resize' ? f.view : f.target).dispatchEvent(new Event(reason));
    await Promise.resolve();
    assert.equal(f.animations[0].value.cancelled, 1);
    assert.equal(f.attrs.get('data-reveal-state'), 'static');
    assert.equal(f.document.activeElement, null, 'controller never changes focus');
    cleanup();
  }
});

test('off, zero duration, missing and failed APIs leave a visible fallback with complete cleanup', async () => {
  for (const options of [{ observerMissing: true }, { animateMissing: true }, { observerThrows: true }, { animateThrows: true }]) {
    const f = fixture(options); const cleanup = connectContentReveal(f.element);
    f.observers[0]?.notify(true);
    assert.equal(f.attrs.get('data-reveal-state'), 'static');
    cleanup(); await Promise.resolve();
    assert.equal(f.view.count + f.media.count + f.target.count, 0);
    assert.equal(f.attrs.has('data-reveal-state'), false);
  }
  for (const options of [{ motion: 'off' as const }, { duration: 0 }]) {
    const f = fixture(); const cleanup = connectContentReveal(f.element, options);
    assert.equal(f.attrs.get('data-reveal-state'), 'static');
    assert.equal(f.observers.length, 0);
    assert.equal(f.animations.length, 0);
    cleanup();
  }
});
