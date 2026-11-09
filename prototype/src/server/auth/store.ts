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
    async limit(key:string,max:number,windowSeconds:number){const at=now(),start=at-at%(windowSeconds*1000);const row=await statement(`INSERT INTO auth_request_limits(key_hash,window_start,attempts) VALUES(?,?,1) ON CONFLICT(key_hash) DO UPDATE SET attempts=CASE WHEN window_start=excluded.window_start THEN attempts+1 ELSE 1 END,window_start=excluded.window_start RETURNING attempts`,await sha256(key),start).first<{attempts:number}>();return !!row&&row.attempts<=max;},
  };
}
