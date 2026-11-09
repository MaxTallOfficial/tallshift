import {useEffect,useRef,useState} from 'react';
import {SystemButton} from '../foundations/SystemButton';
import {authCopy,authErrorMessage} from './auth-copy';
import {AuthClientError,authMutation,type SessionState} from './auth-client';
import type {ProductLocale} from './routes';
import './auth.css';

export function AccountIdentity({locale,session,onRefresh}: {locale:ProductLocale;session:SessionState;onRefresh:()=>Promise<void>}) {
  const t=authCopy[locale],abort=useRef<AbortController|null>(null),busy=useRef(false);
  const [pending,setPending]=useState(false),[message,setMessage]=useState('');
  useEffect(()=>()=>abort.current?.abort(),[]);
  async function logout(all:boolean) {
    if(busy.current)return;
    busy.current=true;setPending(true);setMessage('');const request=new AbortController();abort.current=request;
    try{await authMutation(all?'revoke-sessions':'sign-out',{},request.signal);if(!request.signal.aborted){setMessage(all?t.status.signedOutAll:t.status.signedOut);await onRefresh();}}
    catch(cause){if(!request.signal.aborted)setMessage(authErrorMessage(locale,cause instanceof AuthClientError?cause.code:'NETWORK'));}
    finally{busy.current=false;if(!request.signal.aborted)setPending(false);}
  }
  return <section className="au-profile" aria-label={t.account.title}>
    <div>{session.state==='signed-in'&&session.user?<><p>{t.account.signedInAs}<strong>{session.user.email}</strong></p><p>{t.account.logoutAllHelp}</p></>:<p>{session.state==='loading'?t.status.loading:session.state==='unavailable'?t.status.serviceUnavailable:session.state==='error'?t.status.profileUnavailable:t.account.signedOutBody}</p>}{message&&<p role="status">{message}</p>}</div>
    <div className="au-profile-actions">{session.state==='signed-in'?<><SystemButton disabled={pending} onClick={()=>{void logout(false);}}>{t.actions.logout}</SystemButton><SystemButton disabled={pending} onClick={()=>{void logout(true);}}>{t.actions.logoutAll}</SystemButton></>:session.state==='signed-out'?<a className="system-button" data-variant="secondary" href={`/${locale}/auth/login`}>{t.actions.login}</a>:session.state==='error'?<SystemButton onClick={()=>{void onRefresh();}}>{t.actions.retry}</SystemButton>:<a className="system-button" data-variant="secondary" href={`/${locale}/auth/login`}>{t.actions.login}</a>}</div>
  </section>;
}
