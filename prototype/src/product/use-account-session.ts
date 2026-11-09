import {useCallback,useEffect,useRef,useState} from 'react';
import {readAuthSession,type SessionState} from './auth-client';

export function useAccountSession() {
  const [session,setSession]=useState<SessionState>({state:'loading'});
  const controller=useRef<AbortController|null>(null);
  const refresh=useCallback(async()=>{
    controller.current?.abort();const current=new AbortController();controller.current=current;
    setSession(previous=>({...previous,state:'loading'}));
    try {const result=await readAuthSession(current.signal);if(!current.signal.aborted)setSession(result);}catch{/* Unmounted/superseded refresh has no result. */}
  },[]);
  useEffect(()=>{void refresh();const update=()=>{void refresh();};window.addEventListener('tallshift:auth-changed',update);return()=>{controller.current?.abort();window.removeEventListener('tallshift:auth-changed',update);};},[refresh]);
  return {session,refresh};
}
