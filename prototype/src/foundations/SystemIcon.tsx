import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
 Loading03Icon, StarIcon, Cursor01Icon, Bookmark01Icon, Search01Icon, Cancel01Icon, ArrowDown01Icon, ArrowUp01Icon, ArrowRight01Icon, ArrowLeft01Icon,
 ArrowLeft02Icon, ArrowRight02Icon, Tick02Icon, Copy01Icon, Download01Icon, CodeIcon, Message01Icon,
 PlayIcon, PauseIcon, ReloadIcon, Settings01Icon, FilterHorizontalIcon, GridViewIcon, ComputerIcon,
 Tablet01Icon, SmartPhone01Icon, InformationCircleIcon, Alert02Icon, CancelCircleIcon, Add01Icon,
 MinusSignIcon, ArrowUpRight01Icon, Folder01Icon, File01Icon, Layers01Icon, Delete02Icon, CheckmarkSquare02Icon, SquareIcon, MinusSignSquareIcon,
 BookOpen01Icon, Link01Icon, SparklesIcon,
} from '@hugeicons-pro/core-duotone-rounded';
import './system-icons.css';

export const systemIconNames = [
  'loading', 'star', 'cursor', 'bookmark', 'search', 'close', 'chevron-down', 'chevron-up', 'chevron-right', 'chevron-left',
  'arrow-left', 'arrow-right', 'check', 'copy', 'download', 'code', 'prompt',
  'play', 'pause', 'replay', 'settings', 'filter', 'grid', 'desktop', 'tablet',
  'mobile', 'info', 'warning', 'error', 'plus', 'minus', 'external', 'folder', 'file', 'layers', 'trash', 'checkbox-checked', 'checkbox-unchecked', 'checkbox-mixed',
  'book', 'link', 'sparkles',
] as const;

export type SystemIconName = typeof systemIconNames[number];
export interface SystemIconProps {
  name: SystemIconName;
  size?: 16 | 20 | 24;
  /** Omit for decoration. Interactive parents need their own accessible name. */
  label?: string;
  className?: string;
}

const icons:Record<SystemIconName,IconSvgElement> = {
 loading:Loading03Icon,star:StarIcon,cursor:Cursor01Icon,bookmark:Bookmark01Icon,search:Search01Icon,close:Cancel01Icon,'chevron-down':ArrowDown01Icon,'chevron-up':ArrowUp01Icon,
 'chevron-right':ArrowRight01Icon,'chevron-left':ArrowLeft01Icon,'arrow-left':ArrowLeft02Icon,'arrow-right':ArrowRight02Icon,
 check:Tick02Icon,copy:Copy01Icon,download:Download01Icon,code:CodeIcon,prompt:Message01Icon,play:PlayIcon,pause:PauseIcon,
 replay:ReloadIcon,settings:Settings01Icon,filter:FilterHorizontalIcon,grid:GridViewIcon,desktop:ComputerIcon,tablet:Tablet01Icon,
 mobile:SmartPhone01Icon,info:InformationCircleIcon,warning:Alert02Icon,error:CancelCircleIcon,plus:Add01Icon,minus:MinusSignIcon,
 external:ArrowUpRight01Icon,folder:Folder01Icon,file:File01Icon,layers:Layers01Icon,trash:Delete02Icon,
 'checkbox-checked':CheckmarkSquare02Icon,'checkbox-unchecked':SquareIcon,'checkbox-mixed':MinusSignSquareIcon,
 book:BookOpen01Icon,link:Link01Icon,sparkles:SparklesIcon,
};
/** Duotone Rounded artwork preserves its native fills and secondary opacity. */
export function SystemIcon({name,size=20,label,className=''}:SystemIconProps) {
 const accessibleLabel=label?.trim();
 return <HugeiconsIcon icon={icons[name]} size={size} color="currentColor" className={`system-icon ${className}`.trim()} data-icon={name} data-size={size} data-icon-library="hugeicons-duotone-rounded" role={accessibleLabel?'img':undefined} aria-label={accessibleLabel||undefined} aria-hidden={accessibleLabel?undefined:true} focusable="false"/>;
}
