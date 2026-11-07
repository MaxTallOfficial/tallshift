import { createExampleRecipe } from '../shared/example-recipe';
import component from './ContentTabs.tsx?raw';
import componentStyles from './ContentTabs.module.css?raw';
import demo from './Demo.tsx?raw';
import demoStyles from './Demo.module.css?raw';
import copy from './copy.ts?raw';
import model from './tabs-model.ts?raw';
import modality from './useInputModality.ts?raw';
import { docs, rules } from './docs';

export { Demo } from './Demo';
export { ContentTabs } from './ContentTabs';
export type { ContentTab, ContentTabsProps } from './ContentTabs';

export const recipe = createExampleRecipe({
  id: 'C002', slug: 'content-tabs', name: 'Content Tabs', displayName: { ru: 'Вкладки для переключения содержимого', en: 'Content tabs', vi: 'Tab nội dung' }, docs, rules,
  sourceFiles: [
    { path: 'ContentTabs.tsx', content: component },
    { path: 'ContentTabs.module.css', content: componentStyles },
    { path: 'Demo.tsx', content: demo },
    { path: 'Demo.module.css', content: demoStyles },
    { path: 'copy.ts', content: copy },
    { path: 'tabs-model.ts', content: model },
    { path: 'useInputModality.ts', content: modality },
  ],
});
