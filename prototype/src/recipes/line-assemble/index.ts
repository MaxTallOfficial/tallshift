import { createExampleRecipe } from '../shared/example-recipe';
import source0 from './LineAssemble.tsx?raw';
import source1 from './LineAssemble.module.css?raw';
import source2 from './line-controller.ts?raw';
import source3 from './Demo.tsx?raw';
import source4 from './Demo.module.css?raw';
import source5 from './copy.ts?raw';
import source6 from './useInputModality.ts?raw';
import { docs, rules } from './docs';

export { Demo } from './Demo';
export { LineAssemble } from './LineAssemble';
export type { LineAssembleProps } from './LineAssemble';

export const recipe = createExampleRecipe({
  id: 'A003', slug: 'line-assemble', name: 'Line Assemble',
  displayName: {"ru": "Построчное появление заголовка", "en": "Line-by-line heading entrance", "vi": "Hiện tiêu đề theo dòng"},
  durationMax: 480, colorControl: false, animationEntry: 'line-controller.ts', docs, rules,
  sourceFiles: [
    { path: "LineAssemble.tsx", content: source0 },
    { path: "LineAssemble.module.css", content: source1 },
    { path: "line-controller.ts", content: source2 },
    { path: "Demo.tsx", content: source3 },
    { path: "Demo.module.css", content: source4 },
    { path: "copy.ts", content: source5 },
    { path: "useInputModality.ts", content: source6 },
  ],
});
