import { createExampleRecipe } from '../shared/example-recipe';
import source0 from './useLedgerReflow.ts?raw';
import source1 from './reflow-controller.ts?raw';
import source2 from './Demo.tsx?raw';
import source3 from './Demo.module.css?raw';
import source4 from './copy.ts?raw';
import source5 from './useInputModality.ts?raw';
import { docs, rules } from './docs';

export { Demo } from './Demo';
export { useLedgerReflow } from './useLedgerReflow';

export const recipe = createExampleRecipe({
  id: 'A006', slug: 'ledger-reflow', name: 'Ledger Reflow',
  displayName: {"ru": "Перестроение списка", "en": "List reordering animation", "vi": "Hoạt ảnh sắp xếp danh sách"},
  durationMax: 480, colorControl: false, animationEntry: 'reflow-controller.ts', docs, rules,
  sourceFiles: [
    { path: "useLedgerReflow.ts", content: source0 },
    { path: "reflow-controller.ts", content: source1 },
    { path: "Demo.tsx", content: source2 },
    { path: "Demo.module.css", content: source3 },
    { path: "copy.ts", content: source4 },
    { path: "useInputModality.ts", content: source5 },
  ],
});
