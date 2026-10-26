import type {Locale} from './copy';
import {licenseCopy} from './license-copy';
import {SystemTextLink} from './SystemTextLink';
/** Usage guidance is visible; the link opens the full license rather than a hint menu. */
export function SystemLicenseInfo({locale}:{locale:Locale}) {
 const t=licenseCopy[locale];
 return <p className="system-license-inline"><span>{t.permission}</span> <SystemTextLink href="https://opensource.org/license/mit" target="_blank">{locale==='ru'?'Условия использования':locale==='vi'?'Điều khoản sử dụng':'Usage terms'}</SystemTextLink></p>;
}
