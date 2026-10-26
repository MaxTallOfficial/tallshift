import { SystemIcon, type SystemIconName } from './SystemIcon';
const relayIcons = {idle:'copy',pending:'loading',success:'check',error:'error'} as const satisfies Record<string,SystemIconName>;
/** Site-only renderer: Pro artwork stays outside transferable recipe source. */
export function renderRelayIcon(state:keyof typeof relayIcons) { return <SystemIcon name={relayIcons[state]} size={24}/>; }
