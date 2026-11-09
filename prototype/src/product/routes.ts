export type ProductLocale = 'en' | 'ru' | 'vi';
export type AuthView = 'login'|'register'|'forgot-password'|'reset-password'|'verify-email';
export interface ProductRoute { locale: ProductLocale; page?: 'home' | 'pricing' | 'account' | 'checkout' | 'docs' | 'auth'; authView?:AuthView; docSlug?: string; slug?: string; search: string; hash: string; notFound: boolean }
export function productRoute(url: URL): ProductRoute {
  const parts = url.pathname.split('/').filter(Boolean);
  const locale = (['en', 'ru', 'vi'] as const).find(value => value === parts[0]) ?? 'en';
  if(parts.length===0||parts.length===1&&parts[0]===locale)return {locale,page:'home',slug:undefined,search:url.search,hash:url.hash,notFound:false};
  if(parts.length===2&&parts[0]===locale&&(parts[1]==='pricing'||parts[1]==='account'||parts[1]==='checkout'))return {locale,page:parts[1],slug:undefined,search:url.search,hash:url.hash,notFound:false};
  if (parts[0] === locale && parts[1] === 'docs' && parts.length <= 3) {
    let docSlug: string | undefined;
    try { docSlug = parts[2] ? decodeURIComponent(parts[2]) : undefined; } catch { return {locale,search:url.search,hash:url.hash,notFound:true}; }
    return {locale,page:'docs',docSlug,search:url.search,hash:url.hash,notFound:false};
  }
  if(parts[0]===locale&&parts[1]==='auth'&&parts.length===3&&['login','register','forgot-password','reset-password','verify-email'].includes(parts[2]))return {locale,page:'auth',authView:parts[2] as AuthView,search:url.search,hash:url.hash,notFound:false};
  let slug: string | undefined;
  try { slug = parts[2] ? decodeURIComponent(parts[2]) : undefined; } catch { return { locale, search: url.search, hash: url.hash, notFound: true }; }
  return { locale, slug, search: url.search, hash: url.hash, notFound: parts.length > 3 || (parts.length > 0 && parts[0] !== locale) || (parts.length > 1 && parts[1] !== 'library') };
}
export function localizedProductHref(href: string, locale: ProductLocale) {
  const url = new URL(href, 'https://tallshift.local');
  const route = productRoute(url);
  const path=route.page==='home'?'':route.page==='auth'?`/auth/${route.authView}`:route.page==='docs'?`/docs${route.docSlug ? `/${encodeURIComponent(route.docSlug)}` : ''}`:route.page?`/${route.page}`:`/library${route.slug ? `/${encodeURIComponent(route.slug)}` : ''}`;
  return `/${locale}${path}${url.search}${url.hash}`;
}
