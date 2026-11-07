import {availableExampleIds} from '../product/available-examples.ts';
export const previewVersion = '0.1.0-prototype';
export type PreviewType = 'READY'|'APPLY_CONFIG'|'APPLIED'|'RESIZE'|'REPLAY'|'PAUSE'|'ERROR';
export interface PreviewConfig {locale: 'en'|'ru'|'vi';accent?: string;duration: number;motion: 'off'|'subtle'|'expressive'}
export interface PreviewMessage {protocolVersion: 1;channelId: string;requestId: string;type: PreviewType;itemId: string;itemVersion: string;payload: Record<string,unknown>}
const plain = (value: unknown): value is Record<string,unknown> => Boolean(value) && typeof value==='object' && !Array.isArray(value) && [Object.prototype,null].includes(Object.getPrototypeOf(value));
const exact = (value: Record<string,unknown>,keys: readonly string[]) => Object.keys(value).length===keys.length&&Object.keys(value).every(key=>keys.includes(key));
export const colorless = (itemId: string) => ['E001','A003','A006'].includes(itemId);
export function validPreviewConfig(value: unknown,itemId: string): value is PreviewConfig {
  if (!plain(value)||!availableExampleIds.includes(itemId)) return false;
  if (!exact(value,['locale','duration','motion',...(colorless(itemId)?[]:['accent'])])) return false;
  return ['en','ru','vi'].includes(String(value.locale)) && ['off','subtle','expressive'].includes(String(value.motion)) && Number.isInteger(value.duration) && Number(value.duration)>=0 && Number(value.duration)<=(itemId==='E001'?600:480) && (colorless(itemId)||typeof value.accent==='string'&&/^#[a-f\d]{6}$/i.test(value.accent));
}
export function previewMessage(type: PreviewType,itemId: string,channelId: string,requestId: string,payload: Record<string,unknown>={}): PreviewMessage {return {protocolVersion:1,channelId,requestId,type,itemId,itemVersion:previewVersion,payload};}
export function parsePreviewMessage(value: unknown): PreviewMessage|null {
  try {
    if (!plain(value)||new TextEncoder().encode(JSON.stringify(value)).length>16384||!exact(value,['protocolVersion','channelId','requestId','type','itemId','itemVersion','payload'])) return null;
    if (value.protocolVersion!==1||value.itemVersion!==previewVersion||typeof value.itemId!=='string'||!availableExampleIds.includes(value.itemId)||typeof value.channelId!=='string'||!/^\w[\w-]{15,63}$/.test(value.channelId)||typeof value.requestId!=='string'||!/^\w[\w-]{0,63}$/.test(value.requestId)||!plain(value.payload)) return null;
    const p=value.payload;
    switch(value.type) {
      case 'READY': case 'REPLAY': case 'APPLIED': if (!exact(p,[])) return null; break;
      case 'APPLY_CONFIG': if (!validPreviewConfig(p,value.itemId)) return null; break;
      case 'PAUSE': if (!exact(p,['paused'])||typeof p.paused!=='boolean') return null; break;
      case 'RESIZE': if (!exact(p,['height'])||!Number.isInteger(p.height)||Number(p.height)<120||Number(p.height)>2400) return null; break;
      case 'ERROR': if (!exact(p,['code'])||!['INVALID_CONFIG','RENDER_FAILED'].includes(String(p.code))) return null; break;
      default: return null;
    }
    return value as unknown as PreviewMessage;
  } catch { return null; }
}
/** Per-peer bound; malformed packets consume the same budget as valid packets. */
export function messageBudget(now=()=>Date.now()) {
  let start=now(),count=0;
  return ()=>{const time=now();if(time-start>=1000){start=time;count=0;}return ++count<=30;};
}
