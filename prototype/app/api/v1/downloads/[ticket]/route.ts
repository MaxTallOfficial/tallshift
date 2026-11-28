import {commerceRoutes} from '../../../../../src/server/orders/routes';
// Same session + fresh grant/revocation check + verified private bytes on every request.
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{ticket:string}>}){return commerceRoutes.serveDownload(request,(await context.params).ticket);}
