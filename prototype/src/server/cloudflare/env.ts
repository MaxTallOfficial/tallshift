import type {D1Database} from '@cloudflare/workers-types';
import {getCloudflareContext} from '@opennextjs/cloudflare';

/** Server-only bindings. No environment object is serialized to RSC or a client component. */
export interface TallshiftCloudflareEnv {
  DB?: D1Database;
  APP_ENV?: 'development'|'preview'|'production';
  APP_URL?: string;
  AUTH_ENABLED?: string;
  AUTH_SECRET?: string;
  AUTH_EMAIL_FROM?: string;
  AUTH_EMAIL_API_URL?: string;
  AUTH_EMAIL_API_KEY?: string;
  AUTH_LOCAL_MAIL?: string;
  COMMERCE_ENABLED?: string;
  TON_PAYMENTS_ENABLED?: string;
  TONCENTER_API_KEY?: string;
  TONAPI_WEBHOOK_SECRET?: string;
}

/** Node/Vite previews have no Cloudflare bindings and must fail closed at their caller. */
export async function getCloudflareEnv():Promise<TallshiftCloudflareEnv|null> {
  try {
    const {env}=await getCloudflareContext({async:true});
    return env as TallshiftCloudflareEnv;
  } catch { return null; }
}
