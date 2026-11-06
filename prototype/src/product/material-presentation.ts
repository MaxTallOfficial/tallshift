import {productCopy} from './product-copy.ts';
import type {Material,Locale} from './catalog-data.ts';
/** Public function first; canonical name/slug stay stable for source, search and URLs. */
export function materialDisplayName(material:Material,locale:Locale) {
 return material.id==='A001'?productCopy[locale].buttonTitle:material.title[locale];
}
