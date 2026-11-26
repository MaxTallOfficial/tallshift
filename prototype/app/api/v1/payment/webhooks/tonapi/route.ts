import {commerceRoutes} from '../../../../../../src/server/orders/routes';
// TonAPI account_tx hint (bearer secret). 202 = durable hint, not payment.
export const dynamic='force-dynamic';
export const POST=(request:Request)=>commerceRoutes.tonWebhook(request);
