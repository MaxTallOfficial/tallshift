import type { ComponentType } from 'react';
import { AfterlightExample } from '../study/AfterlightExample';
import { studyArchive, studyFiles, studyPrompt } from '../study/recipe';
import { renderRelayIcon } from '../foundations/relay-icon-renderer';
import { SystemIcon } from '../foundations/SystemIcon';
import { Demo as PressButtonDemo, recipe as pressButtonRecipe } from '../recipes/press-button';
import { Demo as ContentTabsDemo, recipe as contentTabsRecipe } from '../recipes/content-tabs';
import { Demo as ContentRevealDemo, recipe as contentRevealRecipe } from '../recipes/content-reveal';
import { Demo as ActionBandDemo, recipe as actionBandRecipe } from '../recipes/starter-action-band';
import {Demo as SplitHeroDemo,recipe as splitHeroRecipe} from '../recipes/starter-split-hero';
import {Demo as FeatureGridDemo,recipe as featureGridRecipe} from '../recipes/starter-feature-grid';
import {Demo as LineDemo,recipe as lineRecipe} from '../recipes/line-assemble';
import {Demo as LedgerDemo,recipe as ledgerRecipe} from '../recipes/ledger-reflow';
import type { ExampleConfiguration, ExampleFile, ExampleOptions } from '../recipes/shared/example-recipe';

interface MaterialRecipe {
  durationMax?: 480 | 600;
  colorControl?: boolean;
  Demo: ComponentType<ExampleConfiguration>;
  files: (value: Partial<ExampleConfiguration>) => ExampleFile[];
  prompt: (value: ExampleOptions) => string;
  archive: (value: ExampleOptions) => Promise<Uint8Array>;
}
function RelayDemo(config: ExampleConfiguration) {
  return <AfterlightExample {...config} renderStateIcon={renderRelayIcon} actionIcon={<SystemIcon name="external" />} resetIcon={<SystemIcon name="replay" />} />;
}
const recipes: Record<string, MaterialRecipe> = {
  A003: {Demo:LineDemo,...lineRecipe},
  A006: {Demo:LedgerDemo,...ledgerRecipe},
  A001: { Demo: RelayDemo, files: studyFiles, prompt: studyPrompt, archive: studyArchive },
  C001: { Demo: PressButtonDemo, ...pressButtonRecipe },
  C002: { Demo: ContentTabsDemo, ...contentTabsRecipe },
  E001: { Demo: ContentRevealDemo, ...contentRevealRecipe },
  S001: {Demo: SplitHeroDemo,...splitHeroRecipe},
  S002: {Demo: FeatureGridDemo,...featureGridRecipe},
  S003: { Demo: ActionBandDemo, ...actionBandRecipe },
};
export function materialRecipe(id: string): MaterialRecipe | undefined { return recipes[id]; }
