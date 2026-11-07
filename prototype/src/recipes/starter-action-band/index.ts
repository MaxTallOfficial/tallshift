import { createExampleRecipe } from '../shared/example-recipe';
import component from './ActionBand.tsx?raw';
import componentStyles from './ActionBand.module.css?raw';
import demo from './Demo.tsx?raw';
import demoStyles from './Demo.module.css?raw';
import copy from './copy.ts?raw';
import facade from './press-button.ts?raw';
import button from '../press-button/PressButton.tsx?raw';
import buttonStyles from '../press-button/PressButton.module.css?raw';
import modality from '../press-button/input-modality.ts?raw';
import contrast from '../press-button/contrast.ts?raw';
import { docs, rules } from './docs';

export { ActionBand } from './ActionBand';
export type { ActionBandProps, ActionBandAction } from './ActionBand';
export { Demo } from './Demo';

export const recipe = createExampleRecipe({
  id: 'S003', slug: 'starter-action-band', name: 'Starter Action Band',
  displayName: { ru: 'Завершающий блок с действием', en: 'Closing call to action', vi: 'Khối hành động cuối trang' },
  bundledItemIds: ['C001'], docs, rules,
  sourceFiles: [
    { path: 'ActionBand.tsx', content: component },
    { path: 'ActionBand.module.css', content: componentStyles },
    { path: 'Demo.tsx', content: demo },
    { path: 'Demo.module.css', content: demoStyles },
    { path: 'copy.ts', content: copy },
    { path: 'press-button.ts', content: facade.replaceAll('../press-button/', './vendor/press-button/') },
    { path: 'vendor/press-button/PressButton.tsx', content: button },
    { path: 'vendor/press-button/PressButton.module.css', content: buttonStyles },
    { path: 'vendor/press-button/input-modality.ts', content: modality },
    { path: 'vendor/press-button/contrast.ts', content: contrast },
  ],
});
