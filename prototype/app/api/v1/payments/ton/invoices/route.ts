import {commerceRoutes} from '../../../../../../src/server/orders/routes';
// TON/USDT invoice from a persisted server quote; body is only {quoteId, asset}.
export const dynamic='force-dynamic';
export const POST=(request:Request)=>commerceRoutes.createInvoice(request);
