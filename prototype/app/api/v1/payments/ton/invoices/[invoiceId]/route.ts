import {commerceRoutes} from '../../../../../../../src/server/orders/routes';
// Owner-only invoice status read from D1; never scans the chain.
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{invoiceId:string}>}){return commerceRoutes.invoiceStatus(request,(await context.params).invoiceId);}
