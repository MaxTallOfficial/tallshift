export type ProductLocale = 'en' | 'ru' | 'vi';
export interface ProductRoute { locale: ProductLocale; slug?: string; search: string; hash: string; notFound: boolean }
export function productRoute(url: URL): ProductRoute {
  const parts = url.pathname.split('/').filter(Boolean);
  const locale = (['en', 'ru', 'vi'] as const).find(value => value === parts[0]) ?? 'en';
  let slug: string | undefined;
  try { slug = parts[2] ? decodeURIComponent(parts[2]) : undefined; } catch { return { locale, search: url.search, hash: url.hash, notFound: true }; }
  return { locale, slug, search: url.search, hash: url.hash, notFound: parts.length > 3 || (parts.length > 0 && parts[0] !== locale) || (parts.length > 1 && parts[1] !== 'library') };
}
export function localizedProductHref(href: string, locale: ProductLocale) {
  const url = new URL(href, 'https://tallshift.local');
  const route = productRoute(url);
  return `/${locale}/library${route.slug ? `/${encodeURIComponent(route.slug)}` : ''}${url.search}${url.hash}`;
}
