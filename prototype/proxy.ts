import {NextResponse,type NextRequest} from 'next/server';
export function proxy(request:NextRequest) {
  const nonce=Buffer.from(crypto.randomUUID()).toString('base64');
  let preview='';
  try {const url=new URL(process.env.NEXT_PUBLIC_PREVIEW_ORIGIN??'');if(url.href===url.origin+'/')preview=url.origin;}catch{/* Preview remains disabled. */}
  const dev=process.env.NODE_ENV==='development';
  const csp=`default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev?" 'unsafe-eval'":''}; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'${dev?' ws:':''}; frame-src ${preview||"'none'"}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`;
  const headers=new Headers(request.headers);headers.set('x-nonce',nonce);headers.set('x-tallshift-locale',request.nextUrl.pathname.match(/^\/(en|ru|vi)(?:\/|$)/)?.[1]??'en');headers.set('Content-Security-Policy',csp);
  const response=NextResponse.next({request:{headers}});
  response.headers.set('Content-Security-Policy',csp);
  response.headers.set('Permissions-Policy',`camera=(), microphone=(), geolocation=(), clipboard-read=(), clipboard-write=(self${preview?` "${preview}"`:''})`);
  return response;
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
