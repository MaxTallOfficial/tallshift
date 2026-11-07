import {Component,useEffect,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
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
  useLayoutEffect(()=>{if(config&&ack.current){emit('APPLIED',{},ack.current);ack.current='';document.documentElement.lang=config.locale;}},[config]);
  useEffect(()=>{
    if(!root.current)return;
    let previous=0,frame=0;
    const report=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const height=Math.max(120,Math.min(2400,Math.ceil(root.current?.getBoundingClientRect().height??440)));if(height!==previous){previous=height;emit('RESIZE',{height});}});};
    const observer=new ResizeObserver(report);observer.observe(root.current);report();
    return ()=>{cancelAnimationFrame(frame);observer.disconnect();};
  },[]);
  const c=config?{...config,motion:paused?'off' as const:config.motion,duration:paused?0:config.duration}:null;
  const Demo=({A001:AfterlightExample,A003:Line,A006:Ledger,C001:PressButton,C002:Tabs,E001:Reveal,S003:ActionBand,S001:SplitHero,S002:FeatureGrid} as const)[itemId as 'A001'];
  return <div ref={root}><SystemTheme locale={c?.locale??'en'} className="preview-theme"><Boundary key={replay}>{c&&Demo?<Demo {...c}/>:<p>Loading preview…</p>}</Boundary></SystemTheme></div>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
