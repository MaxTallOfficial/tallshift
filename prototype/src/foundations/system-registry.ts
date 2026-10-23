const names = ['Brand mark','Typography','Icon','Button','Icon button','Text link','Text input','Textarea','Search combobox','Select','Checkbox','Radio group','Switch','Slider + number','Color control','Segmented control','Tabs','Filter chip','Badge','Tooltip','Popover','Menu','Dialog','Sheet','Accordion','Toast','Inline alert','Status / progress','Skeleton','Empty / error state','Content tile','Collection tile','Catalog toolbar','Preview viewport','Motion controls','Code panel','Prompt panel','File tree','Download action','Offer / price','Entitlement state','Navigation shell','Pagination / load more','Locale control'];
const sourceFamilies = new Set([21,22,24,38]);
const locations: Record<number, string> = {
  1:'top',2:'system-type',3:'icons',4:'controls',5:'controls',6:'top',7:'controls',8:'controls',9:'discovery',10:'discovery',11:'controls',12:'workbench',13:'controls',14:'roles',15:'roles',16:'icons',17:'workbench',18:'discovery',19:'discovery',20:'controls',21:'workbench',22:'workbench',23:'controls',24:'workbench',25:'workbench',26:'controls',27:'controls',28:'progress',29:'library-states',30:'library-states',31:'discovery',32:'library-states',33:'discovery',34:'workbench',35:'roles',36:'workbench',37:'workbench',38:'workbench',39:'workbench',40:'access-states',41:'access-states',42:'top',43:'library-states',44:'top',
};
/** Coverage records a review specimen, never production or visual approval. */
export const systemCoverage = Object.freeze(names.map((name, index) => Object.freeze({
  id: String(index + 1).padStart(2, '0'), name,
  status: 'review-specimen' as const,
  specimen: locations[index + 1],
  view: sourceFamilies.has(index + 1) ? 'source' as const : index + 1 === 34 ? 'demo' as const : undefined,
})));
