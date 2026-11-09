import {hashPassword,verifyPassword} from 'better-auth/crypto';
/** Local-only harness; never included in the application router or deployment. */
export default {async fetch(){
 const started=performance.now(),password='Local runtime password check 2026';
 try{const hash=await hashPassword(password);const correct=await verifyPassword({hash,password});const incorrect=await verifyPassword({hash,password:'Wrong local runtime password'});return Response.json({ok:correct&&!incorrect,elapsedMs:Math.round(performance.now()-started)});}
 catch{return Response.json({ok:false},{status:500});}
}};
