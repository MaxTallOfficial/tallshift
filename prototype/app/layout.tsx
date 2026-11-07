import type {ReactNode} from 'react';
import {headers} from 'next/headers';
export default async function RootLayout({children}: {children: ReactNode}) {
 const locale=(await headers()).get('x-tallshift-locale')??'en';
 return <html lang={locale}><head><link rel="icon" href="data:,"/></head><body>{children}</body></html>;
}
