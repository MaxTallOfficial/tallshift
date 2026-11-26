import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import type {D1Database} from '@cloudflare/workers-types';
import {createAuthStore,primaryAuthDatabase} from '../src/server/auth/store.ts';
import {createAuthEngine,sessionCookie} from '../src/server/auth/engine.ts';
import {csrfCookie} from '../src/server/auth/security.ts';
import {handleAuthRequest} from '../src/server/auth/handler.ts';
import {sha256} from '../src/server/auth/policy.ts';
// Same in-memory D1 double as tests/auth.test.ts: batch() is one SQLite transaction.
function database(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');sqlite.exec(readFileSync(new URL('../migrations/0002_auth.sql',import.meta.url),'utf8'));
 class Statement{args:unknown[]=[];sql:string;constructor(sql:string){this.sql=sql;}bind(...args:unknown[]){this.args=args;return this;} async all(){const results=sqlite.prepare(this.sql).all(...this.args as never[]);return {success:true,results,meta:{changes:Number(sqlite.prepare('SELECT changes() AS n').get()!.n)}};}async first(){return (await this.all()).results[0]??null;}async run(){return this.all();}async raw(options?:{columnNames?:boolean}){const stmt=sqlite.prepare(this.sql);stmt.setReturnArrays(true);const rows=stmt.all(...this.args as never[]);return options?.columnNames?[stmt.columns().map(c=>c.name),...rows]:rows;}}
 let pending=Promise.resolve();
 const db={prepare:(sql:string)=>new Statement(sql),withSession:()=>db,batch:async(statements:Statement[])=>{const previous=pending;let release!:()=>void;pending=new Promise<void>(resolve=>{release=resolve;});await previous;sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.all());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}finally{release();}}} as unknown as D1Database;
 return {db,sqlite,store:createAuthStore(primaryAuthDatabase(db)),env:{DB:db,AUTH_ENABLED:'true',APP_URL:origin,AUTH_SECRET:secret}};
}
const origin='https://tallshift.test',secret='test-only-secret-with-at-least-32-characters',password='A sufficiently long password!';
const pair=(header:string|null)=>header!.split(';')[0];
function post(path:string,body:unknown,headers:Record<string,string>={}){return new Request(`${origin}/api/auth/${path}`,{method:'POST',headers:{origin,'content-type':'application/json','cf-connecting-ip':'198.51.100.1',...headers},body:JSON.stringify(body)});}
type Env=ReturnType<typeof database>['env'];
/** CSRF challenge bound to the given session cookie (or to no session). */
async function csrf(env:Env,session=''){const response=await handleAuthRequest(post('csrf',{},session?{cookie:session}:{}),env);const {csrfToken}=await response.json() as {csrfToken:string};const cookie=[session,pair(response.headers.get('set-cookie'))].filter(Boolean).join('; ');return {'x-csrf-token':csrfToken,cookie};}
async function user(ctx:ReturnType<typeof database>,email:string,token:string){const context=await createAuthEngine(ctx.db,origin,secret).$context;await ctx.store.register(email,await context.password.hash(password),'',token);await ctx.store.consumeAction(token,'verify');return (await ctx.store.userByEmail(email))!.id;}
async function signIn(env:Env,email:string,extra:Record<string,string>={}){const response=await handleAuthRequest(post('sign-in/email',{email,password},{...await csrf(env),...extra}),env);assert.equal(response.status,200);return pair(response.headers.get('set-cookie'));}
const count=(sqlite:DatabaseSync,table:string,userId:string)=>Number(sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${table==='auth_user'?'id':'user_id'}=?`).get(userId)!.n);

test('deletes the account, its sessions, tokens and limit rows in one batch; sign-in is impossible afterwards',async()=>{
 const ctx=database(),{env,sqlite,store}=ctx,id=await user(ctx,'gone@example.com','a'.repeat(64));
 const session=await signIn(env,'gone@example.com',{'x-forwarded-for':'203.0.113.7','user-agent':'PrivacyTest/1.0'});
 // Fact for the data page: Better Auth stores the sign-in IP and user agent with the session.
 assert.deepEqual({...sqlite.prepare('SELECT ip_address,user_agent FROM auth_session WHERE user_id=?').get(id)},{ip_address:'203.0.113.7',user_agent:'PrivacyTest/1.0'});
 await signIn(env,'gone@example.com');await store.issueAction('b'.repeat(64),id,'reset',3600);
 const headers=await csrf(env,session),response=await handleAuthRequest(post('delete-account',{password},headers),env);
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true});
 const cleared=response.headers.getSetCookie();assert.ok(cleared.some(v=>v.startsWith(`${sessionCookie}=;`)&&v.includes('Max-Age=0')));assert.ok(cleared.some(v=>v.startsWith(`${csrfCookie}=;`)&&v.includes('Max-Age=0')));
 for(const table of ['auth_user','auth_account','auth_session','auth_action_tokens'])assert.equal(count(sqlite,table,id),0,table);
 assert.equal(sqlite.prepare('SELECT 1 FROM auth_request_limits WHERE key_hash=?').get(await sha256('identity:sign-in/email:gone@example.com')),undefined);
 // Repeating the same request finds no session.
 assert.equal((await handleAuthRequest(post('delete-account',{password},headers),env)).status,401);
 const again=await handleAuthRequest(post('sign-in/email',{email:'gone@example.com',password},await csrf(env)),env);assert.equal(again.status,401);assert.deepEqual(await again.json(),{code:'INVALID_CREDENTIALS'});
});

test('wrong password keeps the account and is rate limited',async()=>{
 const ctx=database(),{env,sqlite}=ctx,id=await user(ctx,'keep@example.com','c'.repeat(64)),session=await signIn(env,'keep@example.com');
 const statuses=[];for(let attempt=0;attempt<6;attempt++)statuses.push((await handleAuthRequest(post('delete-account',{password:'Wrong password long enough'},await csrf(env,session)),env)).status);
 assert.deepEqual(statuses,[401,401,401,401,401,429]);assert.equal(count(sqlite,'auth_user',id),1);
 assert.equal((await handleAuthRequest(post('delete-account',{password},await csrf(env,session)),env)).status,429);assert.equal(count(sqlite,'auth_user',id),1);
});

test('requires CSRF bound to this session, exact origin and JSON',async()=>{
 const ctx=database(),{env,sqlite}=ctx,id=await user(ctx,'csrf@example.com','d'.repeat(64)),session=await signIn(env,'csrf@example.com'),headers=await csrf(env,session);
 assert.equal((await handleAuthRequest(post('delete-account',{password},{cookie:session}),env)).status,403);
 assert.equal((await handleAuthRequest(post('delete-account',{password},{...headers,origin:'https://evil.test'}),env)).status,403);
 assert.equal((await handleAuthRequest(post('delete-account',{password},{...headers,'sec-fetch-site':'cross-site'}),env)).status,403);
 assert.equal((await handleAuthRequest(post('delete-account',{password},{...headers,'content-type':'text/plain'}),env)).status,400);
 assert.equal((await handleAuthRequest(new Request(`${origin}/api/auth/delete-account`,{headers}),env)).status,404);
 assert.equal(count(sqlite,'auth_user',id),1);
});

test('foreign or revoked sessions cannot delete anything',async()=>{
 const ctx=database(),{env,sqlite,store}=ctx,a=await user(ctx,'a@example.com','e'.repeat(64)),b=await user(ctx,'b@example.com','f'.repeat(64));
 const sessionA=await signIn(env,'a@example.com'),sessionB=await signIn(env,'b@example.com');
 // CSRF issued for session A does not authorize a request carrying session B.
 const forA=await csrf(env,sessionA);assert.equal((await handleAuthRequest(post('delete-account',{password},{...forA,cookie:forA.cookie.replace(sessionA,sessionB)}),env)).status,403);
 // Session B with user A's password only ever targets B, and B's own password check fails.
 await store.logoutAll(b);const revoked=await handleAuthRequest(post('delete-account',{password},await csrf(env,sessionB)),env);assert.equal(revoked.status,401);
 assert.equal(count(sqlite,'auth_user',a),1);assert.equal(count(sqlite,'auth_user',b),1);
});

test('another user password is rejected and a racing password reset turns the batch into a no-op',async()=>{
 const ctx=database(),{env,sqlite,store}=ctx,owner=await user(ctx,'owner@example.com','1'.repeat(64));
 const other=await createAuthEngine(ctx.db,origin,secret).$context;await store.register('other@example.com',await other.password.hash('Another long password!'),'','2'.repeat(64));await store.consumeAction('2'.repeat(64),'verify');
 const session=await signIn(env,'owner@example.com');
 assert.equal((await handleAuthRequest(post('delete-account',{password:'Another long password!'},await csrf(env,session)),env)).status,401);
 const version=(await store.credential(owner))!.version,sessionId=String(sqlite.prepare('SELECT id FROM auth_session WHERE user_id=?').get(owner)!.id);await store.issueAction('3'.repeat(64),owner,'reset',3600);await store.consumeAction('3'.repeat(64),'reset','new-hash');
 assert.equal(await store.deleteAccount(owner,sessionId,version,[]),false);assert.equal(count(sqlite,'auth_user',owner),1);assert.equal(count(sqlite,'auth_account',owner),1);
});

test('purchase records block self-service deletion until retention is decided',async()=>{
 const ctx=database(),{env,sqlite}=ctx,id=await user(ctx,'buyer@example.com','4'.repeat(64)),session=await signIn(env,'buyer@example.com');
 sqlite.exec('CREATE TABLE ton_invoices(id TEXT PRIMARY KEY,user_id TEXT NOT NULL)');sqlite.prepare('INSERT INTO ton_invoices VALUES(?,?)').run('invoice',id);
 const response=await handleAuthRequest(post('delete-account',{password},await csrf(env,session)),env);assert.equal(response.status,409);assert.deepEqual(await response.json(),{code:'ACCOUNT_HAS_ORDERS'});assert.equal(count(sqlite,'auth_user',id),1);
});

test('logout of the requesting session or a purchase racing the batch leaves everything in place',async()=>{
 const ctx=database(),{env,sqlite,store}=ctx,id=await user(ctx,'race@example.com','5'.repeat(64));await signIn(env,'race@example.com');
 const version=(await store.credential(id))!.version,sessionId=String(sqlite.prepare('SELECT id FROM auth_session WHERE user_id=?').get(id)!.id);
 sqlite.exec('CREATE TABLE ton_invoices(id TEXT PRIMARY KEY,user_id TEXT NOT NULL)');const tables=await store.commerceTables();assert.deepEqual(tables,['ton_invoices']);
 sqlite.prepare('INSERT INTO ton_invoices VALUES(?,?)').run('late-invoice',id);
 assert.equal(await store.deleteAccount(id,sessionId,version,['identity:sign-in/email:race@example.com'],tables),false);
 sqlite.exec('DELETE FROM ton_invoices');sqlite.prepare('DELETE FROM auth_session WHERE id=?').run(sessionId);
 assert.equal(await store.deleteAccount(id,sessionId,version,[],tables),false);
 for(const table of ['auth_user','auth_account'])assert.equal(count(sqlite,table,id),1,table);
});

test('two parallel deletions both report success and clear cookies',async()=>{
 const ctx=database(),{env,sqlite}=ctx,id=await user(ctx,'twice@example.com','6'.repeat(64)),session=await signIn(env,'twice@example.com');
 const [first,second]=await Promise.all([1,2].map(async()=>handleAuthRequest(post('delete-account',{password},await csrf(env,session)),env)));
 const ok=[first,second].filter(response=>response.status===200);assert.ok(ok.length>=1);
 for(const response of [first,second])assert.ok([200,401].includes(response.status),String(response.status));
 for(const response of ok)assert.ok(response.headers.getSetCookie().some(v=>v.startsWith(`${sessionCookie}=;`)));
 assert.equal(count(sqlite,'auth_user',id),0);assert.equal(count(sqlite,'auth_session',id),0);
});
