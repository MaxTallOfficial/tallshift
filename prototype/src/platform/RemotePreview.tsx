import {useEffect,useRef,useState} from 'react';
import type {ExampleConfiguration} from '../recipes/shared/example-recipe';
import {SystemButton} from '../foundations/SystemButton';
import {SystemIcon} from '../foundations/SystemIcon';
import {SystemSegmentedControl} from '../foundations/SystemSegmentedControl';
import {usePlatform} from './platform-context';
import {colorless,messageBudget,parsePreviewMessage,previewMessage} from './preview-protocol';
import './remote-preview.css';

const copy={en:{off:'The interactive example is unavailable because the preview server is not configured yet. You can still read and download the files.',failed:'The preview did not respond. Try loading it again.',retry:'Reload preview',width:'Preview width',full:'Fit',tablet:'640 px',mobile:'320 px',loading:'Loading preview…',stage:'Loading the example. It will appear here in a few seconds.'},ru:{off:'Интерактивный пример пока недоступен: сервер превью не настроен. Файлы можно просмотреть и скачать.',failed:'Превью не ответило. Попробуйте загрузить его ещё раз.',retry:'Загрузить снова',width:'Ширина превью',full:'Авто',tablet:'640 px',mobile:'320 px',loading:'Загружаем превью…',stage:'Загружаем пример. Он появится здесь через несколько секунд.'},vi:{off:'Chưa mở được ví dụ tương tác vì máy chủ xem trước chưa được thiết lập. Bạn vẫn có thể đọc và tải các tệp.',failed:'Bản xem trước không phản hồi. Hãy thử tải lại.',retry:'Tải lại',width:'Chiều rộng bản xem trước',full:'Tự động',tablet:'640 px',mobile:'320 px',loading:'Đang tải bản xem trước…',stage:'Đang tải ví dụ. Ví dụ sẽ hiện ở đây sau vài giây.'}};
/** Exact http(s) origin of the isolated preview server; empty when it is missing, malformed or equals the current origin. */
export function previewFrameOrigin(value:string,current='') {
  try {const url=new URL(value);return url.origin===value&&['https:','http:'].includes(url.protocol)&&url.origin!==current?url.origin:'';}catch{return '';}
}
export function RemotePreview({itemId,config,label}: {itemId:string;config:ExampleConfiguration;label:string}) {
  const {previewOrigin}=usePlatform(),t=copy[config.locale];
  // The configured origin is inlined into the server and client bundles alike, so SSR and the first client render
  // show the loading state; only the same-origin guard needs `location` and runs after hydration.
  const configured=previewFrameOrigin(previewOrigin)!=='';
  const frame=useRef<HTMLIFrameElement>(null),latest=useRef(config);latest.current=config;
  const [generation,setGeneration]=useState(0),[channel,setChannel]=useState(''),[status,setStatus]=useState<'loading'|'ready'|'error'>('loading'),[height,setHeight]=useState(440),[width,setWidth]=useState<'full'|'tablet'|'mobile'>('full');
  const sendApply=useRef<(()=>void)|null>(null);
  const [origin,setOrigin]=useState<string|null>(null),[painted,setPainted]=useState(false);
  useEffect(()=>{setOrigin(previewFrameOrigin(previewOrigin,location.origin));},[previewOrigin]);
  useEffect(()=>{setChannel(crypto.randomUUID());setStatus('loading');setPainted(false);},[generation,itemId]);
  useEffect(()=>{
    if(!channel||!origin)return;
    let active=true,ready=false,sequence=0,pending='',timer:ReturnType<typeof setTimeout>;
    const fail=()=>{if(active)setStatus('error');};
    const send=(type:'APPLY_CONFIG'|'PAUSE'|'REPLAY',payload:Record<string,unknown>={})=>{
      const requestId=String(++sequence);
      frame.current?.contentWindow?.postMessage(previewMessage(type,itemId,channel,requestId,payload),origin);
      return requestId;
    };
    const apply=()=>{
      if(!ready)return;
      const c=latest.current;
      pending=send('APPLY_CONFIG',{locale:c.locale,motion:c.motion,duration:c.duration,...(colorless(itemId)?{}:{accent:c.accent})});
      clearTimeout(timer);timer=setTimeout(fail,5000);setStatus('loading');
    };
    sendApply.current=apply;
    const allowed=messageBudget();
    const receive=(event:MessageEvent)=>{
      if(event.origin!==origin||event.source!==frame.current?.contentWindow||!allowed())return;
      const message=parsePreviewMessage(event.data);
      if(!message||message.channelId!==channel||message.itemId!==itemId)return;
      if(message.type==='READY'&&!ready){ready=true;apply();}
      else if(message.type==='APPLIED'&&message.requestId===pending){clearTimeout(timer);setStatus('ready');setPainted(true);}
      else if(message.type==='RESIZE')setHeight(Number(message.payload.height));
      else if(message.type==='ERROR'){clearTimeout(timer);fail();}
    };
    const pause=()=>send('PAUSE',{paused:document.hidden||!visible});
    let visible=true;
    const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;if(ready)pause();});
    if(frame.current)observer?.observe(frame.current);
    const visibility=()=>{if(ready)pause();};
    addEventListener('message',receive);document.addEventListener('visibilitychange',visibility);
    timer=setTimeout(fail,10000);
    return ()=>{active=false;ready=false;sendApply.current=null;clearTimeout(timer);observer?.disconnect();removeEventListener('message',receive);document.removeEventListener('visibilitychange',visibility);};
  },[origin,channel,itemId]);
  useEffect(()=>{sendApply.current?.();},[config]);
  if(!configured||origin==='')return <p className="rp-unavailable">{t.off}</p>;
  return <div className="rp-preview"><div className="rp-toolbar"><SystemSegmentedControl label={t.width} value={width} onChange={setWidth} options={[{value:'full',label:t.full},{value:'tablet',label:t.tablet},{value:'mobile',label:t.mobile}]}/><SystemButton leadingIcon={<SystemIcon name="replay"/>} onClick={()=>setGeneration(n=>n+1)}>{t.retry}</SystemButton></div><p role="status">{status==='error'?t.failed:status==='loading'?t.loading:''}</p><div className="rp-stage" data-status={painted?'ready':status} style={{height,maxWidth:width==='mobile'?320:width==='tablet'?640:'100%'}}>{!painted&&<div className="rp-stage-state" aria-hidden="true"><span className="rp-stage-bar"/><span className="rp-stage-bar"/><span className="rp-stage-text">{status==='error'?t.failed:t.stage}</span></div>}{channel&&origin&&<iframe key={channel} ref={frame} title={label} src={`${origin}/?item=${encodeURIComponent(itemId)}#channel=${channel}`} sandbox="allow-scripts allow-same-origin" allow={itemId==='A001'?`clipboard-write ${origin}`:undefined} referrerPolicy="no-referrer" style={{height}}/>}</div></div>;
}
