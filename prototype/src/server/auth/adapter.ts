import type {DBAdapter} from 'better-auth/adapters';
import type {BetterAuthOptions} from 'better-auth';
import {sha256} from './policy.ts';
/** Better Auth sees its opaque token; D1 stores only its SHA-256 digest. No secondary/cookie cache. */
export function hashedSessionAdapter(factory:(options:BetterAuthOptions)=>DBAdapter) {
  return (options:BetterAuthOptions):DBAdapter=>{
    const base=factory(options);
    const transform=async(value:Record<string,unknown>)=>{
      const copy={...value};
      if(value.model!=='session')return copy;
      if(Array.isArray(value.where))copy.where=await Promise.all(value.where.map(async clause=>{
        if(clause.field!=='token')return clause;
        return {...clause,value:Array.isArray(clause.value)?await Promise.all(clause.value.map((token:string)=>sha256(token))):await sha256(clause.value)};
      }));
      return copy;
    };
    const wrapped={...base};
    for(const method of ['findOne','findMany','update','updateMany','delete','deleteMany','count','consumeOne'] as const) {
      const original=base[method];
      if(!original)continue;
      // Adapter methods are generic over model rows. Preserve the library's signature at this boundary.
      wrapped[method]=(async(arg:Record<string,unknown>)=>{
        const result=await (original as (arg:unknown)=>Promise<unknown>)(await transform(arg));
        const raw=Array.isArray(arg.where)?arg.where.find(clause=>clause.field==='token'&&typeof clause.value==='string')?.value:undefined;
        if(arg.model==='session'&&raw&&result&&typeof result==='object'&&!Array.isArray(result))return {...result,token:raw};
        return result;
      }) as never;
    }
    wrapped.create=(async(arg:Record<string,unknown>)=>{
      if(arg.model!=='session')return base.create(arg as never);
      const data=arg.data as Record<string,unknown>,raw=String(data.token);
      const result=await base.create({...arg,data:{...data,token:await sha256(raw)}} as never);
      return {...result as object,token:raw};
    }) as DBAdapter['create'];
    return wrapped;
  };
}
