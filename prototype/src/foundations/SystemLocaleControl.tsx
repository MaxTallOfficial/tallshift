import { SystemSegmentedControl } from './SystemSegmentedControl';
import {SystemButton} from './SystemButton';
import {SystemMenu} from './SystemMenu';
import './system-locale-control.css';
export type SystemLocale = 'en' | 'ru' | 'vi';
export interface SystemLocaleControlProps { locale: SystemLocale; onChange: (locale: SystemLocale) => void; label?: string; disabled?: boolean; variant?:'segmented'|'compact';className?:string }
const labels = { en: 'Interface language', ru: 'Язык интерфейса', vi: 'Ngôn ngữ giao diện' };
const languages=[{value:'en',name:'English'},{value:'ru',name:'Русский'},{value:'vi',name:'Tiếng Việt'}] as const;
export function SystemLocaleControl({ locale, onChange, label = labels[locale], disabled,variant='segmented',className='' }: SystemLocaleControlProps) {
  if(variant==='compact')return <SystemMenu label={label} items={languages.map(item=>({id:item.value,label:<span lang={item.value}>{item.name}</span>,kind:'radio',checked:locale===item.value,onSelect:()=>onChange(item.value)}))}
   trigger={props=><SystemButton {...props} disabled={disabled} variant="quiet" className={`system-locale-trigger ${className}`.trim()} aria-label={`${label}: ${languages.find(item=>item.value===locale)!.name}`}>{locale.toUpperCase()}</SystemButton>}/>;
  return <SystemSegmentedControl label={label} value={locale} onChange={onChange} disabled={disabled} options={[
    { value: 'en', label: 'EN', ariaLabel: 'English', lang: 'en' }, { value: 'ru', label: 'RU', ariaLabel: 'Русский', lang: 'ru' }, { value: 'vi', label: 'VI', ariaLabel: 'Tiếng Việt', lang: 'vi' },
  ]} />;
}
