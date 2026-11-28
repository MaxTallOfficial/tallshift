import {commerceRoutes} from '../../../../../src/server/orders/routes';
// Authoritative grants and receipts from the server ledger; 503 while delivery is disabled.
export const dynamic='force-dynamic';
export const GET=(request:Request)=>commerceRoutes.entitlements(request);
