import {useEffect,useRef,useState,type FormEvent} from 'react';
import {SystemButton} from '../foundations/SystemButton';
import {SystemTextInput} from '../foundations/SystemTextField';
import {ProductLink} from './ProductLink';
import {authCopy,authErrorMessage,authPasswordRange,type AuthView} from './auth-copy';
import {AuthClientError,authMutation,readAuthReadiness} from './auth-client';
import type {ProductLocale} from './routes';
import './auth.css';
import {passwordLimits} from '../shared/auth-policy';

export function AuthPage({locale,view,search,onNavigate}: {locale:ProductLocale;view:AuthView;search:string;onNavigate:(href:string)=>void}) {
  const t=authCopy[locale],page=t.views[view];
  const [ready,setReady]=useState<'loading'|'ready'|'unavailable'>('loading');
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState('');
  const [token,setToken]=useState(''),[pending,setPending]=useState(false),[notice,setNotice]=useState<keyof typeof t.status|''>(''),[error,setError]=useState<keyof typeof t.errors|''>(''),[errorCode,setErrorCode]=useState(''),[done,setDone]=useState(false);
  const operation=useRef<AbortController|null>(null),busy=useRef(false);
  useEffect(()=>{
    const abort=new AbortController();
    readAuthReadiness(abort.signal).then(value=>{if(!abort.signal.aborted)setReady(value.enabled&&(!['register','forgot-password'].includes(view)||value.emailReady)?'ready':'unavailable');}).catch(()=>{if(!abort.signal.aborted)setReady('unavailable');});
    return()=>{abort.abort();operation.current?.abort();};
  },[]);
  useEffect(()=>{
    const query=new URLSearchParams(search),value=query.get('token');
    if(value!==null){operation.current?.abort();busy.current=false;setPending(false);setDone(false);setError('');setToken(value.length<=2048?value:'');const url=new URL(location.href);url.searchParams.delete('token');history.replaceState(history.state,'',url.pathname+url.search+url.hash);}
  },[search]);
  const passwordRequired=view==='login'||view==='register'||view==='reset-password';
  const emailRequired=view==='login'||view==='register'||view==='forgot-password';
  const needsToken=view==='verify-email'||view==='reset-password';
  async function submit(event:FormEvent) {
    event.preventDefault();
    if(busy.current||ready!=='ready'||done)return;
    setError('');setErrorCode('');setNotice('');
    if(view==='register'||view==='reset-password'){
      if(password.length<passwordLimits.min){setError('passwordTooShort');return;}
      if(password.length>passwordLimits.max){setError('passwordTooLong');return;}
      if(password!==confirm){setError('passwordMismatch');return;}
    }
    if(needsToken&&!token){setError('invalidToken');return;}
    busy.current=true;setPending(true);const abort=new AbortController();operation.current=abort;
    try {
      const identity={email:email.trim(),locale};
      if(view==='login'){await authMutation('sign-in/email',{...identity,password},abort.signal);if(!abort.signal.aborted)onNavigate(`/${locale}/account`);}
      else if(view==='register'){await authMutation('sign-up/email',{...identity,password},abort.signal);setNotice('registrationRequested');setDone(true);}
      else if(view==='forgot-password'){await authMutation('request-password-reset',identity,abort.signal);setNotice('recoveryRequested');setDone(true);}
      else if(view==='reset-password'){await authMutation('reset-password',{token,newPassword:password,locale},abort.signal);setNotice('passwordReset');setDone(true);setToken('');}
      else {await authMutation('verify-email',{token,locale},abort.signal);setNotice('verified');setDone(true);setToken('');}
      setPassword('');setConfirm('');
    }catch(cause){if(!abort.signal.aborted){const code=cause instanceof AuthClientError?cause.code:'NETWORK';setErrorCode(code);setError('');}}
    finally{busy.current=false;if(!abort.signal.aborted)setPending(false);}
  }
  async function resend() {
    if(busy.current||ready!=='ready'||!email.trim())return;
    busy.current=true;setPending(true);const abort=new AbortController();operation.current=abort;setError('');
    try{await authMutation('send-verification-email',{email:email.trim(),locale},abort.signal);if(!abort.signal.aborted)setNotice('verificationRequested');}catch(cause){if(!abort.signal.aborted)setErrorCode(cause instanceof AuthClientError?cause.code:'NETWORK');}finally{busy.current=false;if(!abort.signal.aborted)setPending(false);}
  }
  return <section className="au-page" aria-labelledby="auth-title">
    <header><h1 id="auth-title">{page.title}</h1><p className="au-lead">{page.lead}</p><p className="au-free">{t.freeAccessNote}</p><a href={`/${locale}/library`}>{t.actions.openCatalog}</a></header>
    <div className="au-form-region">
      <form onSubmit={submit} aria-busy={pending}>
        {emailRequired&&<SystemTextInput label={t.fields.email} id="auth-email" type="email" autoComplete="email" inputMode="email" maxLength={254} required value={email} onChange={e=>setEmail(e.target.value)} disabled={pending||done}/>}
        {passwordRequired&&<SystemTextInput label={view==='reset-password'?t.fields.newPassword:t.fields.password} id="auth-password" type="password" autoComplete={view==='login'?'current-password':'new-password'} minLength={view==='login'?1:passwordLimits.min} maxLength={passwordLimits.max} required value={password} onChange={e=>setPassword(e.target.value)} disabled={pending||done} description={view==='login'?undefined:authPasswordRange(locale,passwordLimits.min,passwordLimits.max)}/>}
        {(view==='register'||view==='reset-password')&&<SystemTextInput label={t.fields.confirmPassword} id="auth-confirm" type="password" autoComplete="new-password" maxLength={passwordLimits.max} required value={confirm} onChange={e=>setConfirm(e.target.value)} disabled={pending||done}/>}
        {ready==='loading'&&<p className="au-status" role="status">{t.status.loading}</p>}
        {ready==='unavailable'&&<p className="au-status">{t.status.serviceUnavailable}</p>}
        {needsToken&&!token&&!done&&ready==='ready'&&<p className="au-error" role="alert">{t.errors.invalidToken}</p>}
        {(error||errorCode)&&<p className="au-error" role="alert">{error?t.errors[error]:authErrorMessage(locale,errorCode)}</p>}
        {notice&&<p className="au-status" role="status">{t.status[notice]}</p>}
        {!done&&<SystemButton type="submit" variant="primary" disabled={ready!=='ready'||pending||needsToken&&!token}>{pending?page.pending:page.submit}</SystemButton>}
        {view==='login'&&errorCode==='EMAIL_NOT_VERIFIED'&&<SystemButton type="button" disabled={pending||ready!=='ready'} onClick={()=>{void resend();}}>{t.actions.resendVerification}</SystemButton>}
      </form>
      <nav className="au-links" aria-label={t.nav}>
        {(view==='verify-email'&&!token)&&<p>{t.verificationHelp}</p>}{view==='reset-password'&&<a href={`/${locale}/auth/forgot-password`}>{t.actions.forgotPassword}</a>}{view==='login'?<><a href={`/${locale}/auth/forgot-password`}>{t.actions.forgotPassword}</a><ProductLink href={`/${locale}/auth/register`}>{t.actions.register}</ProductLink></>:<a href={`/${locale}/auth/login`}>{t.actions.backToLogin}</a>}
      </nav>
    </div>
  </section>;
}
