# @tallshift/ui — local implementation candidate

Shared Tallshift UI components. React 19 is a peer dependency. EN/RU/VI and the approved Afterlight/Manrope/Saffron Lighter foundation are included. This private package is not published to npm. Product source rights are not granted by the bundled Manrope font licence.

Build from the repository root:

```sh
npm --prefix prototype run build:system
npm pack ./packages/tallshift-ui --pack-destination ./packages/tallshift-ui
```

Install the generated archive in your project, then import the CSS once:

```tsx
'use client';
import '@tallshift/ui/styles.css';
import { SystemTheme, SystemButton, SystemTextInput } from '@tallshift/ui';

export function Example() {
  return <SystemTheme locale="en"><SystemTextInput label="Project name" defaultValue="Tallshift"/><SystemButton variant="primary">Continue</SystemButton></SystemTheme>;
}
```

Use `SystemTheme` around the component surface. It scopes variables and font styles and does not mutate body. Floating surfaces stay inside the scoped theme or current native modal. Import the CSS from the app layout for Next.js; interactive usage belongs in a client component. Hosts own server authorization, routing, data fetching, validation text, async operations and error handling.

Component contracts and verification limits: `docs/art-direction-2026/foundations-10.ru.md` in the source repository. The package is an implementation candidate; visual approval and full cross-browser/assistive-technology acceptance are separate.

### Icons

The internal design system uses Hugeicons Pro Bulk Rounded. The React renderer is a dependency; the Pro pack is a peer dependency requiring your own licensed installation. The UI tarball keeps these imports external and does not bundle Pro vectors. Set `HUGEICONS_LICENSE_KEY` in your environment and configure the `@hugeicons-pro` registry as shown in `prototype/.npmrc` before installing the internal package. Never commit the key.

The source ZIP for the separate State Relay material does not include Hugeicons Pro source assets.
