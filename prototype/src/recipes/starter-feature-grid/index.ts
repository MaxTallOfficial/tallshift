import { createExampleRecipe } from '../shared/example-recipe';
import component from './FeatureGrid.tsx?raw';
import componentStyles from './FeatureGrid.module.css?raw';
import demo from './Demo.tsx?raw';
import copy from './copy.ts?raw';
import appearance from './appearance.ts?raw';
import reveal from './reveal.ts?raw';
import revealComponent from '../content-reveal/ContentReveal.tsx?raw';
import revealStyles from '../content-reveal/ContentReveal.module.css?raw';
import revealController from '../content-reveal/reveal-controller.ts?raw';
import { docs, rules } from './docs';

export { FeatureGrid } from './FeatureGrid';
export type { FeatureGridProps } from './FeatureGrid';
export { Demo } from './Demo';

export const recipe = createExampleRecipe({
  id: 'S002', slug: 'starter-feature-grid', name: 'Starter Feature Grid',
  displayName: {"ru": "Сетка преимуществ", "en": "Feature grid", "vi": "Lưới lợi ích"},
  bundledItemIds: ["E001"], docs, rules,
  sourceFiles: [
    { path: 'FeatureGrid.tsx', content: component },
    { path: 'FeatureGrid.module.css', content: componentStyles },
    { path: 'Demo.tsx', content: demo },
    { path: 'copy.ts', content: copy },
    { path: 'appearance.ts', content: appearance },
    { path: 'reveal.ts', content: reveal.replaceAll('../content-reveal/', './vendor/content-reveal/') },
    { path: 'vendor/content-reveal/ContentReveal.tsx', content: revealComponent },
    { path: 'vendor/content-reveal/ContentReveal.module.css', content: revealStyles },
    { path: 'vendor/content-reveal/reveal-controller.ts', content: revealController },
  ],
});
