const names = ['Brand mark','Typography','Icon','Button','Icon button','Text link','Text input','Textarea','Search combobox','Select','Checkbox','Radio group','Switch','Slider + number','Color control','Segmented control','Tabs','Filter chip','Badge','Tooltip','Popover','Menu','Dialog','Sheet','Accordion','Toast','Inline alert','Status / progress','Skeleton','Empty / error state','Content tile','Collection tile','Catalog toolbar','Preview viewport','Motion controls','Code panel','Prompt panel','File tree','Download action','Offer / price','Entitlement state','Navigation shell','Pagination / load more','Locale control'];
const sourceFamilies = new Set([36,38]);
const locations: Record<number, string> = {
  1:'top',2:'system-type',3:'icons',4:'actions',5:'actions',6:'handoff',7:'controls',8:'controls',9:'discovery',10:'discovery',11:'controls',12:'workbench',13:'controls',14:'roles',15:'roles',16:'icons',17:'workbench',18:'discovery',19:'discovery',20:'floating',21:'floating',22:'floating',23:'modals',24:'modals',25:'access-states',26:'feedback',27:'feedback',28:'progress',29:'library-states',30:'library-states',31:'discovery',32:'library-states',33:'discovery',34:'workbench',35:'roles',36:'workbench',37:'workbench',38:'workbench',39:'workbench',40:'access-states',41:'access-states',42:'top',43:'library-states',44:'top',
};
/** Only explicit exported primitives count as shared APIs; composition is tracked separately. */
const sharedApis: Record<number, string> = {
  1:'SystemBrandMark',2:'SystemTypography',3:'SystemIcon',6:'SystemTextLink',4:'SystemButton',5:'SystemIconButton',7:'SystemTextInput',8:'SystemTextarea',
  9:'SystemSearchCombobox',10:'SystemSelect',11:'SystemCheckbox',12:'SystemRadioGroup',13:'SystemSwitch',
  14:'SystemDurationControl',15:'SystemColorControl',16:'SystemSegmentedControl',17:'SystemTabs',
  18:'SystemFilterChip',19:'SystemBadge',20:'SystemTooltip',21:'SystemPopover',22:'SystemMenu',23:'SystemDialog',24:'SystemSheet',25:'SystemAccordion',26:'SystemToastRegion',27:'SystemInlineAlert',29:'SystemSkeleton',30:'SystemEmptyState',28:'SystemProgress',34:'SystemPreviewViewport',35:'SystemMotionControls',38:'SourceNavigator',31:'SystemContentTile',32:'SystemCollectionTile',33:'SystemCatalogToolbar',36:'SystemCodePanel',37:'SystemPromptPanel',39:'SystemDownloadAction',40:'SystemOffer',41:'SystemEntitlementState',42:'SystemNavigationShell',43:'SystemPagination',44:'SystemLocaleControl',
};
const composedApis: Record<number, string> = {};
/** Coverage records a review specimen, never production or visual approval. */
export const systemCoverage = Object.freeze(names.map((name, index) => Object.freeze({
  id: String(index + 1).padStart(2, '0'), name,
  status: 'review-specimen' as const,
  implementation: sharedApis[index + 1] ? 'shared-api' as const : composedApis[index + 1] ? 'composed-api' as const : 'local-specimen' as const,
  api: sharedApis[index + 1] ?? composedApis[index + 1] ?? null,
  visualApproval: 'pending' as const,
  releaseVerification: 'pending' as const,
  specimen: locations[index + 1],
  view: sourceFamilies.has(index + 1) ? 'source' as const : index + 1 === 34 ? 'demo' as const : index + 1 === 37 ? 'prompt' as const : undefined,
})));
