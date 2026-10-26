import type {Locale} from './copy';
import {licenseCopy} from './license-copy';
import {SystemPopover} from './SystemPopover';
import {SystemIconButton} from './SystemIconButton';
import {SystemTextLink} from './SystemTextLink';
/** Explains the free code license; does not describe paid packs or site icon rights. */
export function SystemLicenseInfo({locale}:{locale:Locale}) {
 const t=licenseCopy[locale];
 return <SystemPopover title={t.title} closeLabel={t.close} align="end" trigger={props=><SystemIconButton {...props} icon="info" density="inline" label={t.open}/>}><p>{t.summary}</p><p>{t.notice}</p><p>{t.details}</p><SystemTextLink href="https://opensource.org/license/mit" target="_blank">{t.source}</SystemTextLink></SystemPopover>;
}
