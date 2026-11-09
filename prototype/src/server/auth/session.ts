import {getCloudflareEnv} from '../cloudflare/env.ts';
import {createAuthStore,primaryAuthDatabase,type AuthDatabase} from './store.ts';
import {sessionCookie} from './engine.ts';
import {authConfiguration,readCookie} from './security.ts';
export async function readAuthSession(request:Request,db:AuthDatabase){
  const raw=readCookie(request,sessionCookie);if(!/^[a-zA-Z0-9_-]{20,256}$/.test(raw))return null;
  const store=createAuthStore(db),row=await store.session(raw);if(!row)return null;
  await store.touch(raw);
  return {user:{id:row.userId,email:row.email,name:row.name,emailVerified:!!row.emailVerified},session:{id:row.id,expiresAt:new Date(Math.min(row.expiresAt,row.createdAt+30*86400000)).toISOString()}};
}
/** Primary-authoritative check on each protected request; no JWT or cookie cache. */
export async function getRequestAuthSession(request:Request){const config=authConfiguration(await getCloudflareEnv());return config?readAuthSession(request,primaryAuthDatabase(config.db)):null;}
