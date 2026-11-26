import {commerceRoutes} from '../../../../../../src/server/orders/routes';
// Owner-only order status; never trusts a return URL or client "paid" flag.
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{orderId:string}>}){return commerceRoutes.order(request,(await context.params).orderId);}
