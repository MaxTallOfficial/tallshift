import type {D1Database,D1DatabaseSession} from '@cloudflare/workers-types';
import {authPolicy,sha256} from './policy.ts';
export type AuthDatabase=D1Database|D1DatabaseSession;
export function primaryAuthDatabase(db:D1Database):AuthDatabase{return db.withSession('first-primary');}
export function createAuthStore(db:AuthDatabase,now=()=>Date.now()) {
  const statement=(sql:string,...args:unknown[])=>db.prepare(sql).bind(...args);
  const batch=async(statements:ReturnType<AuthDatabase['prepare']>[])=>{const results=await db.batch(statements);if(results.some(r=>!r.success))throw new Error('AUTH_DATABASE_UNAVAILABLE');return results;};
  return {
    async register(email:string,passwordHash:string,name:string,token:string) {
      const id=crypto.randomUUID(),at=now(),digest=await sha256(token);
      const results=await batch([
        statement('INSERT INTO auth_user(id,name,email,email_verified,created_at,updated_at) VALUES(?,?,?,0,?,?) ON CONFLICT(email) DO NOTHING',id,name,email,at,at),
        statement("INSERT INTO auth_account(id,account_id,provider_id,user_id,password,created_at,updated_at) SELECT ?,id,'credential',id,?,?,? FROM auth_user WHERE id=?",crypto.randomUUID(),passwordHash,at,at,id),
        statement("INSERT INTO auth_action_tokens(token_hash,user_id,purpose,expires_at) SELECT ?,id,'verify',? FROM auth_user WHERE id=?",digest,at+authPolicy.verifySeconds*1000,id),
      ]);return results[0].meta.changes===1;
    },
    async userByEmail(email:string){return statement('SELECT id,email,email_verified AS emailVerified FROM auth_user WHERE email=?',email).first<{id:string;email:string;emailVerified:number}>();},
    async issueAction(token:string,userId:string,purpose:'verify'|'reset',seconds:number){await statement('INSERT INTO auth_action_tokens(token_hash,user_id,purpose,expires_at) VALUES(?,?,?,?)',await sha256(token),userId,purpose,now()+seconds*1000).run();},
    async consumeAction(token:string,purpose:'verify'|'reset',passwordHash?:string) {
      const hash=await sha256(token),claim=crypto.randomUUID(),at=now();
      const statements=[statement('UPDATE auth_action_tokens SET consumed_at=?,claim_id=? WHERE token_hash=? AND purpose=? AND consumed_at IS NULL AND expires_at>? AND EXISTS(SELECT 1 FROM auth_user WHERE id=auth_action_tokens.user_id)',at,claim,hash,purpose,at)];
      const target='SELECT user_id FROM auth_action_tokens WHERE token_hash=? AND claim_id=?';
      if(purpose==='reset') {
        if(!passwordHash)throw new Error('AUTH_INVALID_PASSWORD');
        statements.push(statement(`UPDATE auth_account SET password=?,updated_at=? WHERE provider_id='credential' AND user_id=(${target})`,passwordHash,at,hash,claim));
        statements.push(statement(`UPDATE auth_user SET auth_version=auth_version+1,updated_at=? WHERE id=(${target})`,at,hash,claim));
        statements.push(statement(`DELETE FROM auth_session WHERE user_id=(${target})`,hash,claim));
        statements.push(statement(`UPDATE auth_action_tokens SET consumed_at=? WHERE purpose='reset' AND consumed_at IS NULL AND user_id=(${target})`,at,hash,claim));
      }else statements.push(statement(`UPDATE auth_user SET email_verified=1,updated_at=? WHERE id=(${target})`,at,hash,claim));
      const result=await batch(statements);return result[0].meta.changes===1;
    },
    async actionUser(token:string,purpose:'verify'|'reset'){return statement('SELECT u.id FROM auth_action_tokens t JOIN auth_user u ON u.id=t.user_id WHERE t.token_hash=? AND t.purpose=? AND t.consumed_at IS NULL AND t.expires_at>?',await sha256(token),purpose,now()).first<{id:string}>();},
    async credential(userId:string){return statement("SELECT u.auth_version AS version,a.password FROM auth_user u JOIN auth_account a ON a.user_id=u.id AND a.provider_id='credential' WHERE u.id=? AND u.email_verified=1",userId).first<{version:number;password:string}>();},
    async session(rawToken:string){const at=now();return statement(`SELECT s.id,s.user_id AS userId,s.created_at AS createdAt,s.updated_at AS updatedAt,s.expires_at AS expiresAt,u.email,u.name,u.email_verified AS emailVerified FROM auth_session s JOIN auth_user u ON u.id=s.user_id WHERE s.token_hash=? AND s.auth_version=u.auth_version AND u.email_verified=1 AND s.expires_at>? AND s.created_at>? AND s.updated_at>?`,await sha256(rawToken),at,at-authPolicy.sessionAbsoluteSeconds*1000,at-authPolicy.sessionIdleSeconds*1000).first<{id:string;userId:string;createdAt:number;updatedAt:number;expiresAt:number;email:string;name:string;emailVerified:number}>();},
    async touch(rawToken:string){await statement('UPDATE auth_session SET updated_at=? WHERE token_hash=?',now(),await sha256(rawToken)).run();},
    async logout(rawToken:string){await statement('DELETE FROM auth_session WHERE token_hash=?',await sha256(rawToken)).run();},
    async logoutAll(userId:string){await batch([statement('UPDATE auth_user SET auth_version=auth_version+1,updated_at=? WHERE id=?',now(),userId),statement('DELETE FROM auth_session WHERE user_id=?',userId)]);},
    /** Purchase tables present in this database; they may be absent before commerce migrations are applied. */
    async commerceTables(){
      const rows=await statement("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('commerce_quotes','commerce_orders','ton_invoices') ORDER BY name").all<{name:string}>();
      return (rows.results??[]).map(row=>row.name).filter((name):name is 'commerce_orders'|'commerce_quotes'|'ton_invoices'=>name==='commerce_orders'||name==='commerce_quotes'||name==='ton_invoices');
    },
    async hasCommerceRecords(userId:string,tables:readonly string[]){
      for(const name of tables)if(await statement(`SELECT 1 FROM ${name} WHERE user_id=? LIMIT 1`,userId).first())return true;
      return false;
    },
    async userExists(userId:string){return !!await statement('SELECT 1 FROM auth_user WHERE id=?',userId).first();},
    /**
     * One D1 batch. Every statement repeats the same guard: the user still has the epoch read with the verified password,
     * the requesting session still exists, and no purchase record exists. A racing reset, logout, logout-all or purchase
     * turns the whole batch into a no-op instead of a partial delete or a foreign-key failure.
     */
    async deleteAccount(userId:string,sessionId:string,version:number,limitKeys:readonly string[],commerceTables:readonly string[]=[]) {
      const purchases=commerceTables.map(name=>` AND NOT EXISTS(SELECT 1 FROM ${name} WHERE user_id=?)`).join('');
      const guard=`EXISTS(SELECT 1 FROM auth_user u JOIN auth_session s ON s.user_id=u.id WHERE u.id=? AND u.auth_version=? AND s.id=?)${purchases}`;
      const guardArgs=[userId,version,sessionId,...commerceTables.map(()=>userId)];
      const keys=await Promise.all(limitKeys.map(value=>sha256(value)));
      const statements=[
        ...(keys.length?[statement(`DELETE FROM auth_request_limits WHERE key_hash IN (${keys.map(()=>'?').join(',')}) AND ${guard}`,...keys,...guardArgs)]:[]),
        statement(`DELETE FROM auth_action_tokens WHERE user_id=? AND ${guard}`,userId,...guardArgs),
        statement(`DELETE FROM auth_account WHERE user_id=? AND ${guard}`,userId,...guardArgs),
        statement(`DELETE FROM auth_user WHERE id=? AND ${guard}`,userId,...guardArgs),
      ];
      // auth_session rows go with the user through ON DELETE CASCADE; deleting them earlier would break the session guard.
      const results=await batch(statements);return results[results.length-1].meta.changes===1;
    },
    /**
     * Removes this user's dead rows on a successful sign-in, no scheduler needed: sessions past the absolute, idle or
     * stored expiry or from an old epoch, and email links that expired or were used. Bounded per pass so sign-in stays fast.
     */
    async cleanupExpired(userId:string,max=50){
      const at=now();
      await batch([
        statement('DELETE FROM auth_session WHERE id IN (SELECT s.id FROM auth_session s JOIN auth_user u ON u.id=s.user_id WHERE s.user_id=? AND (s.expires_at<=? OR s.created_at<=? OR s.updated_at<=? OR s.auth_version<>u.auth_version) LIMIT ?)',userId,at,at-authPolicy.sessionAbsoluteSeconds*1000,at-authPolicy.sessionIdleSeconds*1000,max),
        statement('DELETE FROM auth_action_tokens WHERE token_hash IN (SELECT token_hash FROM auth_action_tokens WHERE user_id=? AND (expires_at<=? OR consumed_at IS NOT NULL) LIMIT ?)',userId,at,max),
      ]);
    },
    async limit(key:string,max:number,windowSeconds:number){const at=now(),start=at-at%(windowSeconds*1000);const row=await statement(`INSERT INTO auth_request_limits(key_hash,window_start,attempts) VALUES(?,?,1) ON CONFLICT(key_hash) DO UPDATE SET attempts=CASE WHEN window_start=excluded.window_start THEN attempts+1 ELSE 1 END,window_start=excluded.window_start RETURNING attempts`,await sha256(key),start).first<{attempts:number}>();return !!row&&row.attempts<=max;},
  };
}
