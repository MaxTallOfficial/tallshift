# A001 — installation / React + TypeScript

Source version: 0.1.0-prototype. This is a working local example, not a published production release of the whole library. This recipe's original code uses MIT; that permission does not cover other product materials.

## Files and dependencies

Requires React with `useSyncExternalStore` (React 18+) and TypeScript. No additional runtime package, motion library, remote script or asset is needed. Standard Vite React/TS and Next.js configurations support CSS Modules. Exact tested versions and actual build results belong in the prototype verification report; the existence of this source does not certify every React/Next/Vite version.

Copy the complete directory to `src/recipes/state-relay/` (or your existing component directory), preserving these paths:

```text
state-relay/
  Example.tsx
  SelectedExample.tsx
  config.json
  src/createStateRelay.ts
  src/useStateRelay.ts
  src/StateRelay.module.css
```

All local helpers are included. `SelectedExample.tsx` renders the selected configuration; `Example.tsx` is a reusable full example with defaults. The state controller can be imported separately from the UI.

## Vite

In your existing React/TS application:

```tsx
import SelectedExample from './recipes/state-relay/SelectedExample';
export default function Screen() {
  return <SelectedExample />;
}
```

Adjust the import path for your directory structure. Do not reinstall React or update the project to latest for this recipe.

## Next.js App Router

Import the same `SelectedExample` from a page or component. The example and hook already use `'use client'`; the page itself can remain a Server Component. Browser APIs run only in an event handler. SSR renders a semantic idle button and the hydration snapshot matches it. Clipboard functionality requires JavaScript: do not make this component the only access path to critical data.

## Your own operation

```tsx
'use client';
import { useStateRelay } from './src/useStateRelay';

export function SaveButton() {
  const { state, statusMessage, controller } = useStateRelay('Ready to save');
  async function save() {
    if (state === 'pending') return;
    await controller.run(async (signal) => {
      const response = await fetch('/api/save', { method: 'POST', signal });
      if (!response.ok) throw new Error('The server rejected the save');
    }, { pending: 'Saving', success: 'Saved', error: 'Could not save' });
  }
  return <>
    <button type="button" aria-disabled={state === 'pending'} aria-busy={state === 'pending'} onClick={() => void save()}>Save</button>
    <p role="status" aria-live="polite" aria-atomic="true">{statusMessage}</p>
  </>;
}
```

This snippet illustrates the operation API. Use the layer markup and CSS import from the full `Example.tsx` for the visual animation. `run()` starts immediately and shows success only when the supplied Promise resolves. `fetch` does not reject HTTP 4xx/5xx automatically: the host must check `response.ok`.

## Control contract

- `begin(message?)` immediately publishes pending and returns a ticket with `requestId` and `AbortSignal`.
- `settle(ticket, 'success' | 'error', message?)` accepts only the current ticket. Duplicate/stale results are ignored and return `false`.
- `run(operation, messages?)` returns `{status:'success',value}`, `{status:'error',error}` or `{status:'stale'}`. Operation rejections are handled. It supplies no backend, authorization or business logic.
- `reset(message?)` / `cancel(message?)` invalidates the current ticket and restores idle. AbortSignal stops only operations that support it. Clipboard cannot be aborted: its late outcome is ignored, but the write may already have occurred.
- `destroy()` permanently disposes a standalone controller. Create a new instance afterward. The React hook uses reusable cancel in effect cleanup and React removes its subscription; Strict Mode setup/cleanup/setup remains supported.
- `subscribe`, `getSnapshot`, `getServerSnapshot` expose a local store. No document scans, RAF, timers, observers or global listeners are created.
- Replay, scrub, pause and reverse do not apply to state feedback. Reset is explicit. Error messages do not disappear on a timer.

## Configuration and accessibility

`locale`: `en`, `ru` or `vi`, default `en`; `accent`: `#RRGGBB` only; `motion`: `off`, `subtle`, `expressive`. Default transitions use 120ms / 180ms. The indicator rotates only during a real pending operation; no fictitious percentage is shown. CSS responds immediately to changes in `prefers-reduced-motion`. Off/reduce disables transitions and rotation while preserving a static pending icon, text and result.

The example reserves the same button area using layered grid labels. `aria-disabled` preserves focus; its event handler rejects repeated activation during pending. An `aria-live` status announces the result. Decorative label copies are hidden from the accessibility tree. Tab, Space, Enter and touch use the same native button. Focus and business operations do not wait for CSS.

Keep the reserved area when replacing labels and test long EN/RU/VI text at 200% zoom. Locale changes require no measurement or resize listener. CSS Modules isolate classes. Preserve focus-visible styles and do not put host transforms on decorative icon/label layers.

## Verification

1. On HTTPS or localhost, use Clipboard. Success must follow `writeText`; denied access must produce error.
2. Select “Error · simulation”: it must clearly report a local scenario error without a server request.
3. Check two instances, rapid input, scenario change while pending, reset and unmount. A late success must not replace a newer error.
4. Switch motion off and change the OS reduce preference during pending. Test keyboard, touch, 320–1440px and EN/RU/VI.
5. Run the host's typecheck/build for Next.js and Vite. Mark a target verified only after an actual report.
6. Pure controller tests: Node 24+ `node --test controller.test.mjs` in the bundle directory. They cover races and cleanup, not browser behavior.

Clipboard can complete before a pending frame becomes visible. No artificial minimum duration is inserted.
