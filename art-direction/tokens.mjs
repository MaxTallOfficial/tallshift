export const accents = [
  { id:'berry', hex:'#B52C68', name:'Festival Fuchsia', pantone:'19-2434 TCX', season:'AW 2026–27', ru:'Ягодный', en:'Berry' },
  { id:'acacia', hex:'#D6DE45', name:'Acacia', pantone:'13-0640 TCX', season:'AW 2026–27', ru:'Акация', en:'Acacia' },
  { id:'saffron', hex:'#C99A29', name:'Arrowwood', pantone:'16-0954 TCX', season:'SS 2027', ru:'Охра', en:'Saffron' },
  { id:'clay', hex:'#C98068', name:'Muted Clay', pantone:'16-1330 TCX', season:'AW 2026–27', ru:'Глина', en:'Clay' },
  { id:'waterfall', hex:'#70C5BA', name:'Waterfall', pantone:'15-5516 TCX', season:'SS 2027', ru:'Аква', en:'Waterfall' },
  { id:'fire', hex:'#ED6038', name:'Dragon Fire', pantone:'16-1460 TCX', season:'SS 2027', ru:'Огонь', en:'Fire' },
];
export const directions = {
  material: { name:'Material Signals', bg:'#EDEBE4', surface:'#F9F8F3', ink:'#24231F', muted:'#5F6159', border:'#77796D', line:'#D5D4CA', font:'Manrope', display:'Manrope', radius:10, dark:false },
  type: { name:'Type Foundry', bg:'#E5E1D7', surface:'#F6F2E9', ink:'#22211D', muted:'#625E55', border:'#7D786B', line:'#CEC8BB', font:'Golos Text', display:'Unbounded', radius:2, dark:false },
  night: { name:'Afterlight Instrument', bg:'#12191A', surface:'#1C2526', ink:'#E8EBE4', muted:'#A2AFA9', border:'#72827D', line:'#344440', font:'Manrope', display:'Golos Text', radius:16, dark:true },
};
export const rgb = hex => hex.replace('#','').match(/../g).map(value=>parseInt(value,16));
export function mix(a,b,t) { return '#'+rgb(a).map((value,i)=>Math.round(value+(rgb(b)[i]-value)*t).toString(16).padStart(2,'0')).join(''); }
export function luminance(hex) { return rgb(hex).map(value=>{const c=value/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}).reduce((sum,value,i)=>sum+value*[.2126,.7152,.0722][i],0); }
export function contrast(a,b) { const [l,h]=[luminance(a),luminance(b)].sort((x,y)=>x-y);return (h+.05)/(l+.05); }
export function textTone(accent,bg,min=4.5) { if(contrast(accent,bg)>=min)return accent;const end=contrast('#171818',bg)>contrast('#FFFFFF',bg)?'#171818':'#FFFFFF';for(let i=1;i<=100;i++){const color=mix(accent,end,i/100);if(contrast(color,bg)>=min)return color;}return end; }
export function createTokens(direction='material',accentId='berry') {
  if(!(direction in directions)||!accents.some(a=>a.id===accentId))throw new TypeError('Unsupported style candidate');
  const d=directions[direction],a=accents.find(a=>a.id===accentId), on=contrast('#171818',a.hex)>contrast('#FFFFFF',a.hex)?'#171818':'#FFFFFF';
  return { schemaVersion:'0.1.0',status:'candidate-not-approved',direction,accentCandidate:accentId,color:{background:d.bg,surface:d.surface,text:d.ink,textSecondary:d.muted,border:d.border,divider:d.line,accent:a.hex,onAccent:on,accentHover:mix(a.hex,on==='#FFFFFF'?'#000000':'#FFFFFF',.08),accentSoft:mix(d.surface,a.hex,.09),link:textTone(a.hex,d.surface),selectedBorder:textTone(a.hex,d.dark?d.surface:d.bg,3),focus:textTone(a.hex,d.dark?d.surface:d.bg,3),success:d.dark?'#7AD2A8':'#1C6E4B',error:d.dark?'#FF93A6':'#B52845',warning:d.dark?'#EBC46A':'#7D5612'},type:{body:d.font,display:d.display,code:'ui-monospace',size:{caption:12,label:14,body:16,lead:20,h3:24,h2:40,display:96},lineHeight:{caption:1.5,label:1.45,body:1.6,lead:1.5,heading:1.1}},space:{1:4,2:8,3:12,4:16,6:24,8:32,12:48,16:64,24:96},control:{minHit:44,height:48,compactVisualHeight:36,radius:d.radius,radiusPanel:direction==='material'?16:direction==='type'?2:20,radiusDialog:direction==='type'?2:24,focusRing:2,focusOffset:3},motion:{feedback:120,selection:180,panel:240,composition:480,easing:'cubic-bezier(.2,0,0,1)',autoplay:false,systemReducedMotionPriority:true},layer:{base:0,sticky:10,popover:30,backdrop:40,dialog:50,toast:60} };
}
