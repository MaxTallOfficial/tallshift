import {useEffect,useRef,useState,type FormEvent} from 'react';
import {SystemButton} from '../foundations/SystemButton';
import {SystemCheckbox} from '../foundations/SystemCheckbox';
import {SystemTextInput} from '../foundations/SystemTextField';
import {authCopy,authErrorMessage} from './auth-copy';
import {AuthClientError,authMutation} from './auth-client';
import type {ProductLocale} from './routes';
import {passwordLimits} from '../shared/auth-policy';
import './auth.css';

/** Server deletes in one batch after re-checking the password; success is shown only after it answers. */
export function AccountDeletion({locale,onDeleted}:{locale:ProductLocale;onDeleted:()=>void}) {
  const t=authCopy[locale],d=t.deletion,abort=useRef<AbortController|null>(null),busy=useRef(false);
  const [password,setPassword]=useState(''),[confirmed,setConfirmed]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState('');
  useEffect(()=>()=>abort.current?.abort(),[]);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(busy.current||!password||!confirmed)return;
    busy.current=true;setPending(true);setError('');const request=new AbortController();abort.current=request;
    try{await authMutation('delete-account',{password},request.signal);if(!request.signal.aborted){setPassword('');onDeleted();}}
    catch(cause){
      if(request.signal.aborted)return;
      const code=cause instanceof AuthClientError?cause.code:'NETWORK';
      setError(code==='INVALID_CREDENTIALS'?d.wrongPassword:code==='ACCOUNT_HAS_ORDERS'?d.hasOrders:code==='ACCOUNT_CHANGED'?d.changed:code==='UNAUTHORIZED'?d.sessionExpired:authErrorMessage(locale,code));
    }
    finally{busy.current=false;if(!request.signal.aborted)setPending(false);}
  }
  return <section className="au-delete" aria-labelledby="account-delete-title">
    <div className="au-delete-copy"><h2 id="account-delete-title">{d.title}</h2><p>{d.body}</p><p>{d.keeps}</p><a href={`/${locale}/privacy`}>{d.privacyLink}</a></div>
    <form onSubmit={submit} aria-busy={pending}>
      <SystemTextInput label={d.password} id="account-delete-password" type="password" autoComplete="current-password" maxLength={passwordLimits.max} required value={password} onChange={e=>setPassword(e.target.value)} disabled={pending} description={d.passwordHelp}/>
      <SystemCheckbox label={d.confirm} checked={confirmed} onChange={setConfirmed} disabled={pending} required/>
      {error&&<p className="au-error" role="alert">{error}</p>}
      {pending&&<p className="au-status" role="status">{d.pending}</p>}
      <SystemButton type="submit" variant="destructive" disabled={pending||!password||!confirmed} loading={pending}>{d.submit}</SystemButton>
    </form>
  </section>;
}
