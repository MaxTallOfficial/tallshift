import {Component,useEffect,useLayoutEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import {SystemTheme} from '../src/foundations/SystemTheme';
import {AfterlightExample} from '../src/study/AfterlightExample';
import {Demo as PressButton} from '../src/recipes/press-button/Demo';
import {Demo as Tabs} from '../src/recipes/content-tabs/Demo';
import {Demo as Reveal} from '../src/recipes/content-reveal/Demo';
import {Demo as ActionBand} from '../src/recipes/starter-action-band/Demo';
import {Demo as SplitHero} from '../src/recipes/starter-split-hero/Demo';
import {Demo as FeatureGrid} from '../src/recipes/starter-feature-grid/Demo';
import {Demo as Line} from '../src/recipes/line-assemble/Demo';
import {Demo as Ledger} from '../src/recipes/ledger-reflow/Demo';
import {messageBudget,parsePreviewMessage,previewMessage,type PreviewConfig} from '../src/platform/preview-protocol';
import {heightReporter} from './preview-height';
import '../src/product/tokens.css';
import './preview.css';

const params=new URLSearchParams(location.search),itemId=params.get('item')??'',channelId=new URLSearchParams(location.hash.slice(1)).get('channel')??'';
const parentOrigin=import.meta.env.VITE_PREVIEW_PARENT_ORIGIN??'';
let counter=0;
function emit(type:'READY'|'APPLIED'|'RESIZE'|'ERROR',payload:Record<string,unknown>={},requestId=String(++counter)) {
  if(!parentOrigin||parent===window)return;
  parent.postMessage(previewMessage(type,itemId,channelId,requestId,payload),parentOrigin);
}
class Boundary extends Component<{children:ReactNode},{error:boolean}> {
  state={error:false};
  static getDerivedStateFromError(){return {error:true};}
  componentDidCatch(){emit('ERROR',{code:'RENDER_FAILED'});}
  render(){return this.state.error?<p>Preview unavailable.</p>:this.props.children;}
}
function Preview() {
  const [config,setConfig]=useState<PreviewConfig|null>(null),[paused,setPaused]=useState(false),[replay,setReplay]=useState(0);
  const root=useRef<HTMLDivElement>(null),ack=useRef('');
  const reportHeight=useMemo(()=>heightReporter(()=>root.current?.getBoundingClientRect().height,height=>emit('RESIZE',{height})),[]);
  useEffect(()=>{
    const allowed=messageBudget();
    const receive=(event:MessageEvent)=>{
      if(event.origin!==parentOrigin||event.source!==parent||!allowed())return;
      const message=parsePreviewMessage(event.data);
      if(!message||message.channelId!==channelId||message.itemId!==itemId)return;
      if(message.type==='APPLY_CONFIG'){ack.current=message.requestId;setConfig({...message.payload} as unknown as PreviewConfig);}
      else if(message.type==='PAUSE')setPaused(Boolean(message.payload.paused));
      else if(message.type==='REPLAY')setReplay(n=>n+1);
    };
    addEventListener('message',receive);emit('READY');
    return ()=>removeEventListener('message',receive);
  },[]);
  // Height first, then APPLIED: the parent already has the real height when it marks the preview ready,
  // even while this iframe is off screen and its animation frames are paused.
  useLayoutEffect(()=>{if(config&&ack.current){document.documentElement.lang=config.locale;reportHeight();emit('APPLIED',{},ack.current);ack.current='';}},[config,reportHeight]);
  useEffect(()=>{
    if(!root.current)return;
    let frame=0;
    const report=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(reportHeight);};
    const observer=new ResizeObserver(report);observer.observe(root.current);report();
    // DOM changes and font loading are not tied to rendering, so they keep the height current off screen.
    const mutations=new MutationObserver(reportHeight);mutations.observe(root.current,{subtree:true,childList:true,characterData:true,attributes:true});
    document.fonts?.addEventListener('loadingdone',reportHeight);
    return ()=>{cancelAnimationFrame(frame);observer.disconnect();mutations.disconnect();document.fonts?.removeEventListener('loadingdone',reportHeight);};
  },[reportHeight]);
  const c=config?{...config,motion:paused?'off' as const:config.motion,duration:paused?0:config.duration}:null;
  const Demo=({A001:AfterlightExample,A003:Line,A006:Ledger,C001:PressButton,C002:Tabs,E001:Reveal,S003:ActionBand,S001:SplitHero,S002:FeatureGrid} as const)[itemId as 'A001'];
  return <div ref={root}><SystemTheme locale={c?.locale??'en'} className="preview-theme"><Boundary key={replay}>{c&&Demo?<Demo {...c}/>:<p>Loading preview…</p>}</Boundary></SystemTheme></div>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
