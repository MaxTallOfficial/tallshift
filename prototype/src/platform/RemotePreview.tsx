import {useEffect,useRef,useState} from 'react';
import type {ExampleConfiguration} from '../recipes/shared/example-recipe';
import {SystemButton} from '../foundations/SystemButton';
import {SystemIcon} from '../foundations/SystemIcon';
import {SystemSegmentedControl} from '../foundations/SystemSegmentedControl';
import {usePlatform} from './platform-context';
import {colorless,messageBudget,parsePreviewMessage,previewMessage} from './preview-protocol';
import './remote-preview.css';

const copy={en:{off:'The interactive example is unavailable because the preview server is not configured yet. You can still read and download the files.',failed:'The preview did not respond. Try loading it again.',retry:'Reload preview',width:'Preview width',full:'Fit',tablet:'640 px',mobile:'320 px',loading:'Loading preview…'},ru:{off:'Интерактивный пример пока недоступен: сервер превью не настроен. Файлы можно просмотреть и скачать.',failed:'Превью не ответило. Попробуйте загрузить его ещё раз.',retry:'Загрузить снова',width:'Ширина превью',full:'Авто',tablet:'640 px',mobile:'320 px',loading:'Загружаем превью…'},vi:{off:'Chưa mở được ví dụ tương tác vì máy chủ xem trước chưa được thiết lập. Bạn vẫn có thể đọc và tải các tệp.',failed:'Bản xem trước không phản hồi. Hãy thử tải lại.',retry:'Tải lại',width:'Chiều rộng bản xem trước',full:'Tự động',tablet:'640 px',mobile:'320 px',loading:'Đang tải bản xem trước…'}};
export function RemotePreview({itemId,config,label}: {itemId:string;config:ExampleConfiguration;label:string}) {
  const {previewOrigin}=usePlatform(),t=copy[config.locale];
  const frame=useRef<HTMLIFrameElement>(null),latest=useRef(config);latest.current=config;
  const [generation,setGeneration]=useState(0),[channel,setChannel]=useState(''),[status,setStatus]=useState<'loading'|'ready'|'error'>('loading'),[height,setHeight]=useState(440),[width,setWidth]=useState<'full'|'tablet'|'mobile'>('full');
  const sendApply=useRef<(()=>void)|null>(null);
  const [origin,setOrigin]=useState('');
  useEffect(()=>{try {const url=new URL(previewOrigin);setOrigin(url.origin===previewOrigin&&url.origin!==location.origin&&['https:','http:'].includes(url.protocol)?url.origin:'');}catch{setOrigin('');}},[previewOrigin]);
  useEffect(()=>{setChannel(crypto.randomUUID());setStatus('loading');},[generation,itemId]);
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
      else if(message.type==='APPLIED'&&message.requestId===pending){clearTimeout(timer);setStatus('ready');}
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
  if(!origin)return <p className="rp-unavailable">{t.off}</p>;
  return <div className="rp-preview"><div className="rp-toolbar"><SystemSegmentedControl label={t.width} value={width} onChange={setWidth} options={[{value:'full',label:t.full},{value:'tablet',label:t.tablet},{value:'mobile',label:t.mobile}]}/><SystemButton leadingIcon={<SystemIcon name="replay"/>} onClick={()=>setGeneration(n=>n+1)}>{t.retry}</SystemButton></div><p role="status">{status==='error'?t.failed:status==='loading'?t.loading:''}</p>{channel&&<iframe key={channel} ref={frame} title={label} src={`${origin}/?item=${encodeURIComponent(itemId)}#channel=${channel}`} sandbox="allow-scripts allow-same-origin" allow={itemId==='A001'?`clipboard-write ${origin}`:undefined} referrerPolicy="no-referrer" style={{height,maxWidth:width==='mobile'?320:width==='tablet'?640:'100%'}}/>}</div>;
}
