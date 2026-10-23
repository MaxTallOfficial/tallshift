# State Relay / A001@0.1.0-prototype

A working local React + TypeScript recipe under MIT. Copy the complete directory and import SelectedExample.tsx. Defaults: EN, subtle, #3569ed, 120ms. Supports EN/RU/VI. Generated ZIPs contain the configuration selected in Studio.

Installation: INSTALL.en.md. Integration: INTEGRATE.en.md. License: LICENSE.txt. No motion runtime dependency; the host supplies React 19.3.1; other versions have not been separately tested.

`Example.tsx` calls the real Clipboard API. “Error · simulation” is an explicitly labeled local scenario. No minimum pending timer is added; stale success cannot replace a newer error. Off/reduce disables movement while preserving information and focus.

Pure controller tests: Node 24+, `node --test controller.test.mjs`. Next.js/Vite builds and browser checks are separate; actual results belong in the prototype report. This is not a published production release of the whole library.
