import test from 'node:test';
import assert from 'node:assert/strict';
import { connectLineAssemble, lineTiming, normalizeLineOptions } from '../src/recipes/line-assemble/line-controller.ts';
import { boundedTranslation, connectLedgerReflow, normalizeReflowOptions } from '../src/recipes/ledger-reflow/reflow-controller.ts';

class TrackedTarget extends EventTarget {
  active = new Map<string, Set<EventListenerOrEventListenerObject>>();
  override addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean) {
    if (listener) { if (!this.active.has(type)) this.active.set(type, new Set()); this.active.get(type)!.add(listener); }
    super.addEventListener(type, listener, options);
  }
  override removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean) {
    if (listener) this.active.get(type)?.delete(listener);
    super.removeEventListener(type, listener, options);
  }
  get count() { return [...this.active.values()].reduce((sum, set) => sum + set.size, 0); }
}
class FakeAnimation {
  cancellations = 0;
  resolve!: (value: unknown) => void;
  reject!: (reason?: unknown) => void;
  finished = new Promise((resolve, reject) => { this.resolve = resolve; this.reject = reject; });
  cancel() { this.cancellations++; this.reject(new Error('cancelled')); }
}
const rect = (top: number, left = 0, width = 120, height = 24) => ({ top, left, width, height, bottom: top + height, right: left + width } as DOMRect);

function lineFixture({ visible = false, reduced = false, loading = false } = {}) {
  const animations: { animation: FakeAnimation; frames: Keyframe[]; options: KeyframeAnimationOptions }[] = [];
  const media = Object.assign(new TrackedTarget(), { matches: reduced });
  const fonts = Object.assign(new TrackedTarget(), { status: loading ? 'loading' : 'loaded' });
  let notify: ((inside: boolean) => void) | undefined;
  let disconnected = 0;
  const view = Object.assign(new TrackedTarget(), { innerHeight: 600, innerWidth: 800, matchMedia: () => media,
    IntersectionObserver: class { constructor(callback: IntersectionObserverCallback) { notify = inside => callback([{ target: element, isIntersecting: inside } as IntersectionObserverEntry], this as unknown as IntersectionObserver); } observe() {} disconnect() { disconnected++; } },
    ResizeObserver: class { observe() {} disconnect() { disconnected++; } },
  });
  const attributes = new Map<string, string>();
  const words = [0, 1, 2, 3].map(index => ({ getBoundingClientRect: () => rect(index < 2 ? 700 : 730), animate: (frames: Keyframe[], options: KeyframeAnimationOptions) => { const animation = new FakeAnimation(); animations.push({ animation, frames, options }); return animation; } }));
  const element = { ownerDocument: { defaultView: view, fonts }, parentElement: null,
    getBoundingClientRect: () => rect(visible ? 40 : 700, 0, 280, 60), querySelectorAll: () => words,
    getAttribute: (name: string) => attributes.get(name) ?? null, setAttribute: (name: string, value: string) => attributes.set(name, value), removeAttribute: (name: string) => attributes.delete(name),
  } as unknown as HTMLElement;
  return { element, words, animations, media, fonts, view, attributes, enter: () => notify?.(true), leave: () => notify?.(false), get disconnected() { return disconnected; } };
}

test('heading total timing includes all lines and respects a 480ms budget', () => {
  assert.deepEqual(normalizeLineOptions({ duration: Infinity, lineDelay: -9 }), { duration: 320, lineDelay: 0, once: true, motion: 'subtle' });
  assert.equal(normalizeLineOptions({ duration: 999, lineDelay: 999 }).duration, 480);
  for (const lines of [1, 2, 10, 100, 480]) for (const budget of [0, 1, 80, 480]) {
    const timing = lineTiming(lines, budget, 80);
    assert.ok(timing.duration + timing.delay * (lines - 1) <= budget); assert.ok(timing.duration >= 0);
  }
});

test('already visible headings skip entrance but explicitly replay, then completely clean up', async () => {
  const f = lineFixture({ visible: true }); const controller = connectLineAssemble(f.element);
  f.enter(); assert.equal(f.animations.length, 0);
  controller.replay(); assert.equal(f.animations.length, 4);
  assert.equal(f.animations[0].options.delay, 0);
  assert.ok(Number(f.animations[2].options.delay) > 0);
  assert.ok(Number(f.animations[2].options.duration) + Number(f.animations[2].options.delay) <= 320);
  controller.destroy(); await Promise.resolve();
  assert.ok(f.animations.every(value => value.animation.cancellations === 1));
  assert.equal(f.view.count + f.media.count + f.fonts.count, 0); assert.equal(f.disconnected, 2);
  assert.equal(f.attributes.has('data-line-state'), false);
  controller.replay(); assert.equal(f.animations.length, 4);
});

test('heading entrance is once by default and repeats only with once=false', () => {
  const f = lineFixture(); const controller = connectLineAssemble(f.element);
  f.enter(); assert.equal(f.animations.length, 4); f.leave(); f.enter(); assert.equal(f.animations.length, 4); controller.destroy();
  const g = lineFixture(); const repeated = connectLineAssemble(g.element, { once: false });
  g.enter(); g.leave(); g.enter(); assert.equal(g.animations.length, 8); repeated.destroy();
});

test('loading fonts, zero, off and reduced motion keep ordinary heading text', () => {
  for (const options of [{ duration: 0 }, { motion: 'off' as const }]) {
    const f = lineFixture(); const controller = connectLineAssemble(f.element, options);
    f.enter(); controller.replay(); assert.equal(f.animations.length, 0); controller.destroy();
  }
  for (const fixtureOptions of [{ reduced: true }, { loading: true }]) {
    const f = lineFixture(fixtureOptions); const controller = connectLineAssemble(f.element);
    f.enter(); controller.replay(); assert.equal(f.animations.length, 0); controller.destroy();
  }
});

test('resize and font completion cancel masks without automatic replay', () => {
  const f = lineFixture(); const controller = connectLineAssemble(f.element);
  f.enter(); f.fonts.dispatchEvent(new Event('loadingdone'));
  assert.ok(f.animations.every(value => value.animation.cancellations === 1));
  f.leave(); f.enter(); assert.equal(f.animations.length, 4);
  controller.replay(); f.view.dispatchEvent(new Event('resize'));
  assert.ok(f.animations.every(value => value.animation.cancellations === 1)); controller.destroy();
});

test('list travel is bounded by vector length, including arbitrary diagonals', () => {
  assert.deepEqual(normalizeReflowOptions({ duration: 900, maxDistance: 900 }), { duration: 480, maxDistance: 160, motion: 'subtle' });
  assert.equal(normalizeReflowOptions({ maxDistance: NaN }).maxDistance, 120);
  assert.deepEqual(boundedTranslation(300, 400, 100), { x: 60, y: 80 }); assert.deepEqual(boundedTranslation(0, 0, 0), { x: 0, y: 0 });
});

function listFixture({ reduced = false } = {}) {
  const animations: { animation: FakeAnimation; frames: Keyframe[] }[] = [];
  const media = Object.assign(new TrackedTarget(), { matches: reduced });
  const view = Object.assign(new TrackedTarget(), { matchMedia: () => media, innerHeight: 600, getComputedStyle: () => ({ overflowY: 'auto' }) });
  const scroll = { scrollTop: 0, scrollHeight: 500, clientHeight: 100, parentElement: null, getBoundingClientRect: () => rect(0, 0, 300, 100) };
  const body = {};
  const doc = { defaultView: view, activeElement: body as unknown, body, scrollingElement: {scrollTop:0}, contains: (target: unknown) => items.some(item => item === target) };
  const row = (key: string, top: number) => {
    const target = { key, top, nodeType: 1, focused: 0, hasAttribute: (name: string) => name === 'data-reflow-key', getAttribute: () => key,
      getBoundingClientRect: () => rect(target.top - scroll.scrollTop, 0, 300, 40), contains: (element: unknown) => element === target,
      focus: () => { target.focused++; doc.activeElement = target; },
      querySelector: () => ({ animate: (frames: Keyframe[]) => { const animation = new FakeAnimation(); animations.push({ animation, frames }); return animation; } }),
    }; return target;
  };
  let items = [row('a', 0), row('b', 50), row('c', 100)];
  const root = Object.assign(new TrackedTarget(), { ownerDocument: doc, parentElement: scroll, children: items,
    getBoundingClientRect: () => rect(0, 0, 300, 150), focus: () => { doc.activeElement = root; },
  });
  return { root: root as unknown as HTMLElement, target: root, media, view, doc, scroll, animations, row, get items() { return items; }, set items(value: typeof items) { items = value; root.children = value; } };
}

test('reorder animates survivors after native DOM order is already changed', () => {
  const f = listFixture(); const controller = connectLedgerReflow(f.root, { motion: 'expressive', maxDistance: 160 });
  controller.capture(); f.items[0].top = 100; f.items[2].top = 0; f.items = [...f.items].reverse(); controller.commit();
  assert.equal(f.items[0].key, 'c'); assert.ok(f.animations.length > 0);
  controller.destroy(); assert.ok(f.animations.every(value => value.animation.cancellations === 1));
  assert.equal(f.media.count + f.view.count + f.target.count, 0);
});

test('surviving visible anchor retains scroll position and removed focused row gets a fallback', () => {
  const f = listFixture(); const controller = connectLedgerReflow(f.root);
  controller.capture(); for (const item of f.items) item.top += 50;
  f.items = [f.row('new', 0), ...f.items]; controller.commit(); assert.equal(f.scroll.scrollTop, 50);
  const focused = f.items[1]; f.doc.activeElement = focused;
  controller.capture(); f.items = f.items.filter(item => item !== focused); f.doc.activeElement = f.doc.body; controller.commit();
  assert.equal(f.items[1].focused, 1); controller.destroy();
});

test('off, zero, reduce and missing capture leave actual data updates immediate', () => {
  for (const options of [{ duration: 0 }, { motion: 'off' as const }]) {
    const f = listFixture(); const controller = connectLedgerReflow(f.root, options);
    controller.capture(); f.items = [f.row('new', 0), ...f.items]; controller.commit();
    assert.equal(f.animations.length, 0); assert.equal(f.items[0].key, 'new'); controller.destroy();
  }
  const f = listFixture({ reduced: true }); const controller = connectLedgerReflow(f.root);
  controller.capture(); f.items = [f.row('new', 0), ...f.items]; controller.commit(); assert.equal(f.animations.length, 0); controller.destroy();
  const g = listFixture(); const other = connectLedgerReflow(g.root);
  g.items = [g.row('new', 0), ...g.items]; other.commit(); assert.equal(g.animations.length, 0); other.destroy();
});

test('rapid changes replace owned animation while two lists stay independent', () => {
  const f = listFixture(); const g = listFixture(); const first = connectLedgerReflow(f.root); const second = connectLedgerReflow(g.root);
  first.capture(); f.items = [f.row('new', 0), ...f.items]; first.commit();
  first.capture(); assert.equal(f.animations[0].animation.cancellations, 1);
  f.items = [...f.items].reverse(); first.commit(); f.view.dispatchEvent(new Event('resize'));
  assert.ok(f.animations.every(value => value.animation.cancellations === 1)); assert.equal(g.animations.length, 0);
  first.destroy(); second.destroy();
});
