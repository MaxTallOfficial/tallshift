import { createExampleRecipe } from '../shared/example-recipe';
import component from './SplitHero.tsx?raw';
import componentStyles from './SplitHero.module.css?raw';
import demo from './Demo.tsx?raw';
import copy from './copy.ts?raw';
import appearance from './appearance.ts?raw';
import reveal from './reveal.ts?raw';
import demoStyles from './Demo.module.css?raw';
import buttonFacade from './press-button.ts?raw';
import revealComponent from '../content-reveal/ContentReveal.tsx?raw';
import revealStyles from '../content-reveal/ContentReveal.module.css?raw';
import revealController from '../content-reveal/reveal-controller.ts?raw';
import button from '../press-button/PressButton.tsx?raw';
import buttonStyles from '../press-button/PressButton.module.css?raw';
import modality from '../press-button/input-modality.ts?raw';
import contrast from '../press-button/contrast.ts?raw';
import { docs, rules } from './docs';

export { SplitHero } from './SplitHero';
export type { SplitHeroProps } from './SplitHero';
export { Demo } from './Demo';

export const recipe = createExampleRecipe({
  id: 'S001', slug: 'starter-split-hero', name: 'Starter Split Hero',
  displayName: {"ru": "Первый экран в две колонки", "en": "Two-column page introduction", "vi": "Phần mở đầu hai cột"},
  bundledItemIds: ["C001", "E001"], docs, rules,
  sourceFiles: [
    { path: 'SplitHero.tsx', content: component },
    { path: 'SplitHero.module.css', content: componentStyles },
    { path: 'Demo.tsx', content: demo },
    { path: 'copy.ts', content: copy },
    { path: 'appearance.ts', content: appearance },
    { path: 'reveal.ts', content: reveal.replaceAll('../content-reveal/', './vendor/content-reveal/') },
    { path: 'Demo.module.css', content: demoStyles },
    { path: 'press-button.ts', content: buttonFacade.replaceAll('../press-button/', './vendor/press-button/') },
    { path: 'vendor/content-reveal/ContentReveal.tsx', content: revealComponent },
    { path: 'vendor/content-reveal/ContentReveal.module.css', content: revealStyles },
    { path: 'vendor/content-reveal/reveal-controller.ts', content: revealController },
    { path: 'vendor/press-button/PressButton.tsx', content: button },
    { path: 'vendor/press-button/PressButton.module.css', content: buttonStyles },
    { path: 'vendor/press-button/input-modality.ts', content: modality },
    { path: 'vendor/press-button/contrast.ts', content: contrast },
  ],
});
