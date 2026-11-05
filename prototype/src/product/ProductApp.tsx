import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { SystemBrandMark } from '../foundations/SystemBrandMark';
import { SystemButton } from '../foundations/SystemButton';
import { SystemIcon } from '../foundations/SystemIcon';
import { SystemInlineAlert } from '../foundations/SystemInlineAlert';
import { SystemLocaleControl } from '../foundations/SystemLocaleControl';
import { SystemNavigationShell } from '../foundations/SystemNavigationShell';
import { SystemTheme } from '../foundations/SystemTheme';
import { CatalogPage } from './CatalogPage';
import { materials } from './catalog-data';
import { localizedProductHref, productRoute, type ProductLocale } from './routes';
import { productCopy } from './product-copy';
import '../foundations/system-focus.css';
import './product.css';

const current = () => productRoute(new URL(location.href));
const MaterialPage = lazy(() => import('./MaterialPage').then(module => ({ default: module.MaterialPage })));
const savedKey = 'tallshift:saved:v1';
function readSaved() {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(savedKey) ?? '[]');
    return { ids: Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && materials.some(item => item.id === id)) : [], unavailable: false };
  } catch { return { ids: [] as string[], unavailable: true }; }
}

export default function ProductApp() {
  const [route, setRoute] = useState(current);
  const [favorites, setFavorites] = useState(readSaved);
  const [navigationTick, setNavigationTick] = useState(0);
  const main = useRef<HTMLElement>(null);
  const catalogSearch = useRef(!route.slug ? route.search : '');
  const nextScroll = useRef(0);
  const t = productCopy[route.locale];
  const material = materials.find(item => item.slug === route.slug);
  if (!route.slug) catalogSearch.current = route.search;

  useEffect(() => {
    const previousRestoration = history.scrollRestoration; history.scrollRestoration = 'manual';
    if (!route.notFound && location.pathname.split('/').filter(Boolean).length < 2) history.replaceState(history.state, '', localizedProductHref(location.href, route.locale));
    const pop = () => { nextScroll.current = history.state?.tallshiftScroll ?? 0; setRoute(current()); setNavigationTick(value => value + 1); };
    let scrollFrame = 0;
    const saveScroll = () => {
      if (scrollFrame) return;
      const href = location.href;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        if (location.href === href) history.replaceState({ ...history.state, tallshiftScroll: window.scrollY }, '', href);
      });
    };
    addEventListener('popstate', pop);
    addEventListener('scroll', saveScroll, { passive: true });
    return () => { removeEventListener('popstate', pop); removeEventListener('scroll', saveScroll); cancelAnimationFrame(scrollFrame); history.scrollRestoration = previousRestoration; };
  }, []);
  useEffect(() => {
    document.documentElement.lang = route.locale;
    document.title = `${route.notFound || (route.slug && !material) ? '404' : material?.name ?? t.materials} — Tallshift`;
  }, [route, material, t]);
  useLayoutEffect(() => {
    if (navigationTick === 0) return;
    const frame = requestAnimationFrame(() => {
      main.current?.focus({ preventScroll: true });
      window.scrollTo({ top: nextScroll.current, behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [navigationTick]);

  function navigate(href: string) {
    const url = new URL(href, location.href);
    history.replaceState({ ...history.state, tallshiftScroll: window.scrollY }, '', location.href);
    history.pushState({}, '', url.pathname + url.search + url.hash);
    nextScroll.current = 0; setRoute(current()); setNavigationTick(value => value + 1);
  }
  function searchChanged(search: string) {
    const href = `${location.pathname}${search}${location.hash}`;
    history.replaceState(history.state, '', href); setRoute(current());
  }
  function localeChanged(locale: ProductLocale) {
    history.replaceState(history.state, '', localizedProductHref(location.href, locale));
    setRoute(current());
  }
  function intercept(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
    if (!anchor || anchor.target || anchor.download || anchor.getAttribute('href')?.startsWith('#')) return;
    const url = new URL(anchor.href, location.href);
    if (url.origin !== location.origin || !/^\/(en|ru|vi)\/library(?:\/|$)/.test(url.pathname)) return;
    event.preventDefault(); navigate(anchor.href);
  }
  function toggleFavorite(id: string) {
    const ids = favorites.ids.includes(id) ? favorites.ids.filter(value => value !== id) : [...favorites.ids, id];
    let unavailable = favorites.unavailable;
    try { localStorage.setItem(savedKey, JSON.stringify(ids)); } catch { unavailable = true; }
    setFavorites({ ids, unavailable });
  }

  return <SystemTheme locale={route.locale} className="tp-app"><div onClick={intercept}>
    <div className="tp-shell-wrap"><SystemNavigationShell className="tp-shell" brand={<SystemBrandMark href={`/${route.locale}/library`} aria-label="Tallshift" />} edition={t.preview} label={t.nav} localeControl={<SystemLocaleControl locale={route.locale} onChange={localeChanged} />} items={[{ id: 'library', href: `/${route.locale}/library${catalogSearch.current}`, label: t.materials }, { id: 'relay', href: `/${route.locale}/library/state-relay`, label: t.try }]} activeId={route.slug === 'state-relay' ? 'relay' : 'library'} skipLink={{ href: '#product-main', label: t.skip }} menuLabels={{ open: t.menu, close: t.close }} /></div>
    <main id="product-main" ref={main} tabIndex={-1}>
      {favorites.unavailable && <div className="tp-storage-note"><SystemInlineAlert tone="warning" title={t.storage}>{t.storageBody}</SystemInlineAlert></div>}
      {route.notFound || (route.slug && !material) ? <section className="tp-not-found"><p className="tp-eyebrow">404 / TALLSHIFT</p><h1>{t.notFound}</h1><p>{t.notFoundBody}</p><SystemButton leadingIcon={<SystemIcon name="arrow-left" />} onClick={() => navigate(`/${route.locale}/library`)}>{t.back}</SystemButton></section> : material ? <Suspense fallback={<p className="tp-loading" role="status">Tallshift…</p>}><MaterialPage key={material.id} material={material} locale={route.locale} search={route.search} catalogSearch={catalogSearch.current} onSearchChange={searchChanged} saved={favorites.ids.includes(material.id)} onToggleFavorite={() => toggleFavorite(material.id)} /></Suspense> : <CatalogPage locale={route.locale} search={route.search} onSearchChange={searchChanged} onNavigate={navigate} favorites={favorites.ids} onToggleFavorite={toggleFavorite} />}
    </main>
    <footer className="tp-footer"><div><SystemBrandMark href={`/${route.locale}/library`} aria-label="Tallshift" /><p>{t.footer}</p></div><div><p>{t.by}</p><p>React + TypeScript · EN / RU / VI</p></div></footer>
  </div></SystemTheme>;
}
