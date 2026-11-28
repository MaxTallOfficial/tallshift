import {getCloudflareEnv,type TallshiftCloudflareEnv} from '../cloudflare/env.ts';
import {authConfiguration} from '../auth/security.ts';
import {paidReleaseRegistry} from '../delivery/releases.ts';
import {createCommerceHost,createTonWebhookHost} from './host.ts';
import {productionCommerceDependencies} from './launch.ts';
import {deliveryFlagEnabled,salesFlagsEnabled} from './flags.ts';

/**
 * Thin adapters for the mounted /api/v1 commerce routes. Flags are checked before any
 * database access, so environments without the commerce migrations (production today)
 * answer 503 COMMERCE_DISABLED without touching D1. No client value reaches a decision.
 */
const disabled = () => Response.json({error: {code: 'COMMERCE_DISABLED', requestId: crypto.randomUUID(), retryable: true}}, {status: 503, headers: {'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer'}});
const unavailable = () => Response.json({error: {code: 'TEMPORARILY_UNAVAILABLE', requestId: crypto.randomUUID(), retryable: true}}, {status: 503, headers: {'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer'}});

type Gate = 'sales' | 'status' | 'delivery';
const open = (env: TallshiftCloudflareEnv, gate: Gate) =>
  gate === 'sales' ? salesFlagsEnabled(env) : gate === 'delivery' ? deliveryFlagEnabled(env) : salesFlagsEnabled(env) || deliveryFlagEnabled(env);

async function withHost(gate: Gate, run: (host: ReturnType<typeof createCommerceHost>) => Promise<Response>, envOverride?: TallshiftCloudflareEnv | null) {
  const env = envOverride === undefined ? await getCloudflareEnv() : envOverride;
  if (!env || !open(env, gate) || !authConfiguration(env)) return disabled();
  let host: ReturnType<typeof createCommerceHost>;
  try {
    const deliveryReady = deliveryFlagEnabled(env) && Boolean(env.PAID_ARTIFACTS) && paidReleaseRegistry.length > 0;
    host = createCommerceHost(env, productionCommerceDependencies({deliveryReady}));
  } catch {return disabled();}
  try {return await run(host);} catch {return unavailable();}
}

export const commerceRoutes = {
  quote: (request: Request, env?: TallshiftCloudflareEnv | null) => withHost('sales', host => host.commerce.quote(request), env),
  createInvoice: (request: Request, env?: TallshiftCloudflareEnv | null) => withHost('sales', host => host.createInvoice(request), env),
  /** Status reads keep working during an emergency stop of new sales. */
  order: (request: Request, orderId: string, env?: TallshiftCloudflareEnv | null) => withHost('status', host => host.commerce.order(request, orderId), env),
  invoiceStatus: (request: Request, invoiceId: string, env?: TallshiftCloudflareEnv | null) => withHost('status', host => host.invoiceStatus(request, invoiceId), env),
  entitlements: (request: Request, env?: TallshiftCloudflareEnv | null) => withHost('delivery', host => host.delivery.entitlements(request), env),
  issueDownload: (request: Request, env?: TallshiftCloudflareEnv | null) => withHost('delivery', host => host.delivery.issue(request), env),
  serveDownload: (request: Request, ticket: string, env?: TallshiftCloudflareEnv | null) => withHost('delivery', host => host.delivery.serve(request, ticket), env),
  /** Provider hint only. Requires the separate bearer secret; independent of auth and sale flags. */
  async tonWebhook(request: Request, envOverride?: TallshiftCloudflareEnv | null) {
    const env = envOverride === undefined ? await getCloudflareEnv() : envOverride;
    if (!env?.DB || !env.TONAPI_WEBHOOK_SECRET) return disabled();
    try {return await createTonWebhookHost(env).webhook(request);} catch {return unavailable();}
  },
};
