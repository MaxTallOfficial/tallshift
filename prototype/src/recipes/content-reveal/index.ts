import { createExampleRecipe } from '../shared/example-recipe';
import component from './ContentReveal.tsx?raw';
import componentStyles from './ContentReveal.module.css?raw';
import controller from './reveal-controller.ts?raw';
import demo from './Demo.tsx?raw';
import demoStyles from './Demo.module.css?raw';
import copy from './copy.ts?raw';
import modality from './useInputModality.ts?raw';
import { docs, rules } from './docs';

export { Demo } from './Demo';
export { ContentReveal } from './ContentReveal';
export type { ContentRevealProps } from './ContentReveal';

export const recipe = createExampleRecipe({
  id: 'E001', slug: 'content-reveal', name: 'Content Reveal',
  displayName: { ru: 'Плавное появление содержимого', en: 'Content fade-in', vi: 'Hiện nội dung' },
  durationMax: 600, colorControl: false, animationEntry: 'reveal-controller.ts', docs, rules,
  sourceFiles: [
    { path: 'ContentReveal.tsx', content: component },
    { path: 'ContentReveal.module.css', content: componentStyles },
    { path: 'reveal-controller.ts', content: controller },
    { path: 'Demo.tsx', content: demo },
    { path: 'Demo.module.css', content: demoStyles },
    { path: 'copy.ts', content: copy },
    { path: 'useInputModality.ts', content: modality },
  ],
});
