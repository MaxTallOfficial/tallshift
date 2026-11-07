'use client';
import ProductApp from '../src/product/ProductApp';
import {PlatformProvider} from '../src/platform/platform-context';
export default function ClientProduct({initialUrl}: {initialUrl: string}) {
  return <PlatformProvider value={{production: true, previewOrigin: process.env.NEXT_PUBLIC_PREVIEW_ORIGIN ?? ''}}><ProductApp initialUrl={initialUrl}/></PlatformProvider>;
}
