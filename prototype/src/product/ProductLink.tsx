import type {ReactNode} from 'react';
import {SystemIcon} from '../foundations/SystemIcon';
import '../foundations/system-button.css';
export function ProductLink({href,children,primary=false}:{href:string;children:ReactNode;primary?:boolean}) {
 return <a href={href} className="system-button product-link" data-variant={primary?'primary':'secondary'}><span className="system-button-label">{children}</span><SystemIcon name="arrow-right" size={20}/></a>;
}
