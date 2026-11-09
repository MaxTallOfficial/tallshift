-- Better Auth 1.7.18 schema with hashed-at-rest session adapter and atomic host recovery.
CREATE TABLE auth_user(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,email_verified INTEGER NOT NULL DEFAULT 0,image TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,auth_version INTEGER NOT NULL DEFAULT 0);
CREATE TABLE auth_session(id TEXT PRIMARY KEY,token_hash TEXT NOT NULL UNIQUE,user_id TEXT NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,ip_address TEXT,user_agent TEXT,auth_version INTEGER NOT NULL DEFAULT 0);
CREATE INDEX auth_session_user ON auth_session(user_id);
CREATE TABLE auth_account(id TEXT PRIMARY KEY,account_id TEXT NOT NULL,provider_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,access_token TEXT,refresh_token TEXT,id_token TEXT,access_token_expires_at INTEGER,refresh_token_expires_at INTEGER,scope TEXT,password TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE UNIQUE INDEX auth_account_identity ON auth_account(provider_id,account_id);
CREATE TABLE auth_verification(id TEXT PRIMARY KEY,identifier TEXT NOT NULL,value TEXT NOT NULL,expires_at INTEGER NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE INDEX auth_verification_identifier ON auth_verification(identifier);
CREATE TABLE auth_action_tokens(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,purpose TEXT NOT NULL CHECK(purpose IN ('verify','reset')),expires_at INTEGER NOT NULL,consumed_at INTEGER,claim_id TEXT);
CREATE INDEX auth_action_user ON auth_action_tokens(user_id,purpose);
CREATE TABLE auth_request_limits(key_hash TEXT PRIMARY KEY,window_start INTEGER NOT NULL,attempts INTEGER NOT NULL);
-- A reset/logout-all racing password verification must prevent creating a stale epoch session.
CREATE TRIGGER auth_session_epoch BEFORE INSERT ON auth_session
WHEN NOT EXISTS(SELECT 1 FROM auth_user WHERE id=NEW.user_id AND auth_version=NEW.auth_version AND email_verified=1)
BEGIN SELECT RAISE(ABORT,'AUTH_SESSION_EPOCH_CHANGED'); END;
