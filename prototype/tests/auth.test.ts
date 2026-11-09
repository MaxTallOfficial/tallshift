import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import type {D1Database} from '@cloudflare/workers-types';
import {createAuthStore,primaryAuthDatabase} from '../src/server/auth/store.ts';
import {createAuthEngine,sessionCookie} from '../src/server/auth/engine.ts';
import {cookie,issueCsrf,requireCsrf} from '../src/server/auth/security.ts';
import {handleAuthRequest} from '../src/server/auth/handler.ts';
import {readAuthSession} from '../src/server/auth/session.ts';
import {sha256} from '../src/server/auth/policy.ts';
function database(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');sqlite.exec(readFileSync(new URL('../migrations/0002_auth.sql',import.meta.url),'utf8'));
 class Statement{args:unknown[]=[];sql:string;constructor(sql:string){this.sql=sql;}bind(...args:unknown[]){this.args=args;return this;} async all(){const results=sqlite.prepare(this.sql).all(...this.args as never[]);return {success:true,results,meta:{changes:Number(sqlite.prepare('SELECT changes() AS n').get()!.n)}};}async first(){return (await this.all()).results[0]??null;}async run(){return this.all();}async raw(options?:{columnNames?:boolean}){const stmt=sqlite.prepare(this.sql);stmt.setReturnArrays(true);const rows=stmt.all(...this.args as never[]);return options?.columnNames?[stmt.columns().map(c=>c.name),...rows]:rows;}}
 let pending=Promise.resolve();
 const db={prepare:(sql:string)=>new Statement(sql),withSession:(mode:string)=>{assert.equal(mode,'first-primary');return db;},batch:async(statements:Statement[])=>{const previous=pending;let release!:()=>void;pending=new Promise<void>(resolve=>{release=resolve;});await previous;sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.all());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}finally{release();}}} as unknown as D1Database;
 return {db,sqlite,store:createAuthStore(primaryAuthDatabase(db))};
}
const origin='https://tallshift.test',secret='test-only-secret-with-at-least-32-characters';
const password='A sufficiently long password!';
function request(path:string,body:unknown={},headers:Record<string,string>={}){return new Request(`${origin}/api/auth/${path}`,{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(body)});}
test('CSRF requires exact origin, bound token, expiry and current session',async()=>{
 const issued=(await issueCsrf(request('csrf'),origin,secret))!;const headers={'x-csrf-token':issued.csrfToken,cookie:issued.cookie.split(';')[0]};
 assert.equal(await requireCsrf(request('sign-out',{},headers),origin,secret),true);
 assert.equal(await requireCsrf(request('sign-out',{}, {...headers,origin:'https://sibling.tallshift.test'}),origin,secret),false);
 assert.equal(await requireCsrf(request('sign-out',{}, {...headers,cookie:`${headers.cookie}; ${sessionCookie}=changed`}),origin,secret),false);
 assert.equal(await requireCsrf(request('sign-out',{}, {...headers,'x-csrf-token':issued.csrfToken.replace(/^./,'0')}),origin,secret),false);
 assert.match(cookie(sessionCookie,'opaque',12),/Path=\/; Secure; HttpOnly; SameSite=Lax/);
});
test('D1 register, one-use reset, atomic rollback and authoritative session epochs',async()=>{
 const {store,sqlite}=database();assert.equal(await store.register('one@example.com','old-hash','','a'.repeat(64)),true);assert.equal(await store.register('one@example.com','other','','b'.repeat(64)),false);
 const user=(await store.userByEmail('one@example.com'))!;assert.equal(await store.consumeAction('a'.repeat(64),'verify'),true);assert.equal(await store.consumeAction('a'.repeat(64),'verify'),false);
 const at=Date.now(),raw='opaque-session-token-for-test';sqlite.prepare('INSERT INTO auth_session VALUES(?,?,?,?,?,?,?,?,?)').run('session',await sha256(raw),user.id,at+86400000,at,at,null,null,0);
 assert.ok(await store.session(raw));await store.issueAction('c'.repeat(64),user.id,'reset',3600);
 sqlite.exec("CREATE TRIGGER test_failure BEFORE UPDATE OF password ON auth_account BEGIN SELECT RAISE(ABORT,'test'); END");await assert.rejects(()=>store.consumeAction('c'.repeat(64),'reset','new-hash'));assert.ok(await store.actionUser('c'.repeat(64),'reset'));assert.ok(await store.session(raw));sqlite.exec('DROP TRIGGER test_failure');
 // Independently queued requests contend on the CAS; only one is accepted.
 const outcomes=await Promise.all([1,2].map(attempt=>store.consumeAction('c'.repeat(64),'reset',`new-hash-${attempt}`)));assert.equal(outcomes.filter(Boolean).length,1);assert.equal(await store.session(raw),null);
 const digest=await sha256(raw);assert.throws(()=>sqlite.prepare('INSERT INTO auth_session VALUES(?,?,?,?,?,?,?,?,?)').run('stale',digest,user.id,at+86400000,at,at,null,null,0));
});
test('atomic limiter gives an exact budget with overlapping requests',async()=>{const {store}=database();const results=await Promise.all(Array.from({length:50},()=>store.limit('identity:test',10,600)));assert.equal(results.filter(Boolean).length,10);});
test('Better Auth engine uses real Drizzle/D1 adapter, hashes opaque sessions and public projection',async()=>{
 const {db,store,sqlite}=database();const engine=createAuthEngine(db,origin,secret),ctx=await engine.$context;await store.register('login@example.com',await ctx.password.hash(password),'','d'.repeat(64));await store.consumeAction('d'.repeat(64),'verify');
 await assert.rejects(()=>engine.api.signInEmail({body:{email:'absent@example.com',password}}));
 await assert.rejects(()=>engine.api.signInEmail({body:{email:'login@example.com',password:'wrong password long enough'}}));
 const result=await engine.api.signInEmail({body:{email:'login@example.com',password}});const row=sqlite.prepare('SELECT token_hash FROM auth_session').get()!;assert.equal(row.token_hash,await sha256(result.token));assert.notEqual(row.token_hash,result.token);
 const req=new Request(`${origin}/api/auth/get-session`,{headers:{cookie:`${sessionCookie}=${result.token}`}});const session=await readAuthSession(req,db);assert.equal(session?.user.email,'login@example.com');assert.equal('password' in session!.user,false);await store.logoutAll(session!.user.id);assert.equal(await readAuthSession(req,db),null);
});
test('HTTP route fails closed, rejects cross-origin, enforces bounds and never exposes BA routes',async()=>{
 const {db,store}=database(),env={DB:db,AUTH_ENABLED:'true',APP_URL:origin,AUTH_SECRET:secret};
 assert.deepEqual(await (await handleAuthRequest(new Request(`${origin}/api/auth/readiness`),null)).json(),{enabled:false,emailReady:false});assert.equal((await handleAuthRequest(new Request(`${origin}/api/auth/get-session`),null)).status,503);
 const response=await handleAuthRequest(request('csrf'),env),data=await response.json() as {csrfToken:string};const headers={'x-csrf-token':data.csrfToken,cookie:response.headers.get('set-cookie')!.split(';')[0]};
 assert.equal((await handleAuthRequest(request('sign-up/email',{email:'one@example.com',password},headers),env)).status,503);
 assert.equal((await handleAuthRequest(request('verify-email',{token:'bad'},headers),env)).status,400);
 assert.equal((await handleAuthRequest(request('reset-password',{token:'e'.repeat(64),newPassword:'x'.repeat(129)},headers),env)).status,400);
 assert.equal((await handleAuthRequest(request('sign-in/email',{email:'one@example.com',password},{...headers,origin:'https://evil.test'}),env)).status,403);
 assert.equal((await handleAuthRequest(request('change-password',{},headers),env)).status,404);
 const engine=createAuthEngine(db,origin,secret),context=await engine.$context;await store.register('unverified@example.com',await context.password.hash(password),'','f'.repeat(64));
 const unverified=await handleAuthRequest(request('sign-in/email',{email:'unverified@example.com',password},headers),env);assert.equal(unverified.status,403);assert.deepEqual(await unverified.json(),{code:'EMAIL_NOT_VERIFIED'});
 assert.equal((await handleAuthRequest(request('sign-in/email',{email:'unverified@example.com',password:'Wrong password long enough'},headers),env)).status,401);
 assert.equal((await handleAuthRequest(request('sign-out',{oversized:'x'.repeat(5000)},headers),env)).status,400);
});
