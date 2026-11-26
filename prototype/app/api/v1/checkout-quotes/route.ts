import {commerceRoutes} from '../../../../src/server/orders/routes';
// Server quote for the signed-in owner; 503 COMMERCE_DISABLED while sales flags are off.
export const dynamic='force-dynamic';
export const POST=(request:Request)=>commerceRoutes.quote(request);
