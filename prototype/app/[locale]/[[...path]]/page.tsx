import type {Metadata} from 'next';
import {connection} from 'next/server';
import {notFound} from 'next/navigation';
import {materials} from '../../../src/product/catalog-data';
import {productRoute} from '../../../src/product/routes';
import {materialDisplayName} from '../../../src/product/material-presentation';
import {checkoutCopy} from '../../../src/product/checkout-copy';
import {pageCopy} from '../../../src/product/page-copy';
import {docsTopics, docsPromptTemplates, docsUiCopy} from '../../../src/product/docs-content';
import ClientProduct from '../../product-client';

type Props = {params: Promise<{locale: string; path?: string[]}>};
function resolve(locale: string, path: string[] = []) {
  const pathname = `/${locale}${path.length ? '/' + path.map(encodeURIComponent).join('/') : ''}`;
  const route = productRoute(new URL(pathname, 'https://tallshift.local'));
  const material = materials.find(item => item.slug === route.slug);
  const doc = docsTopics.find(topic => topic.slug === route.docSlug);
  const template = docsPromptTemplates.find(topic => `ai-template-${topic.slug}` === route.docSlug);
  if (route.notFound || route.slug && !material || route.docSlug && !doc && !template) notFound();
  const title = material ? materialDisplayName(material,route.locale) : route.page === 'docs' ? doc?.title[route.locale] ?? template?.title[route.locale] ?? docsUiCopy[route.locale].title : route.page === 'checkout' ? checkoutCopy[route.locale].title : route.page ? pageCopy[route.locale][route.page] : {en:'Catalog',ru:'Каталог',vi:'Danh mục'}[route.locale];
  return {pathname,route,title};
}
export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale,path} = await params;
  const {pathname,title,route} = resolve(locale,path);
  return {title: `${title} — Tallshift`, robots: {index: route.page !== 'account' && route.page !== 'checkout',follow: true},
    alternates: {canonical: pathname,languages: Object.fromEntries(['en','ru','vi'].map(lang=>[lang,pathname.replace(/^\/(en|ru|vi)/,`/${lang}`)]))}};
}
export default async function Page({params}: Props) {
  await connection();
  const {locale,path} = await params;
  const {pathname} = resolve(locale,path);
  return <ClientProduct initialUrl={pathname}/>;
}
