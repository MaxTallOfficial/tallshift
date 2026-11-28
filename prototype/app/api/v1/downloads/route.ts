import {commerceRoutes} from '../../../../src/server/orders/routes';
// Issues a short-lived, session-bound ticket for one covered release.
export const dynamic='force-dynamic';
export const POST=(request:Request)=>commerceRoutes.issueDownload(request);
