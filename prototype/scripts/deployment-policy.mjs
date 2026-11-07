import {getDomain} from 'tldts';
export function deploymentPolicy(main,preview,{local=false}={}) {
  const a=new URL(main),b=new URL(preview);
  for(const url of [a,b]) if(url.origin!==url.href.replace(/\/$/, '')||url.username||url.password) throw new Error('Supply exact origins without paths, credentials, query or hash');
  if(a.origin===b.origin) throw new Error('Main and preview origins must differ');
  const loopback=url=>['127.0.0.1','localhost','[::1]'].includes(url.hostname);
  if(local&&loopback(a)&&loopback(b))return {main:a.origin,preview:b.origin,local:true};
  if(a.protocol!=='https:'||b.protocol!=='https:')throw new Error('Production origins require HTTPS');
  const first=getDomain(a.hostname,{allowPrivateDomains:true}),second=getDomain(b.hostname,{allowPrivateDomains:true});
  if(!first||!second||first===second)throw new Error('Production preview requires a different registrable domain');
  return {main:a.origin,preview:b.origin,local:false};
}
