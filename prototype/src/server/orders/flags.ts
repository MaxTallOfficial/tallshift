import type {TallshiftCloudflareEnv} from '../cloudflare/env.ts';
/** New sales need both flags; reviewed releases, readiness, tax and FX still gate every quote. */
export const salesFlagsEnabled=(env:TallshiftCloudflareEnv)=>env.COMMERCE_ENABLED==='true'&&env.TON_PAYMENTS_ENABLED==='true';
/** Delivery has its own flag so an emergency stop of new checkouts never blocks existing owners. */
export const deliveryFlagEnabled=(env:TallshiftCloudflareEnv)=>env.COMMERCE_DELIVERY_ENABLED==='true';
