import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PressButton } from '../../src/recipes/press-button/PressButton';
import { ContentTabs } from '../../src/recipes/content-tabs/ContentTabs';

/** Browser fixture for the reusable API, separate from the product demonstration. */
export function mountContracts() {
  const host = document.createElement('div');
  host.id = 'example-contracts';
  host.style.cssText = 'padding:16px;max-width:100%;box-sizing:border-box';
  document.body.append(host);
  const app = document.getElementById('root');
  if (app) app.style.display = 'none';
  const root = createRoot(host);
  const changes: string[] = [];
  let setPending: (pending: boolean) => void = () => {};
  let setControlled: (id: string) => void = () => {};
  let setItems: (ids: string[]) => void = () => {};
  function Harness() {
    const [count, countChanged] = useState(0);
    const [pending, pendingChanged] = useState(false);
    const [controlled, controlledChanged] = useState('first');
    const [ids, idsChanged] = useState(['first', 'second', 'third']);
    setPending = pendingChanged; setControlled = controlledChanged; setItems = idsChanged;
    const tabs = ids.map(id => ({ id, label: `Section ${id} with a long label`, content: <a href={`#${id}`}>Content {id}</a> }));
    return <>
      <PressButton id="contract-button" label="Run local action" pending={pending} pendingLabel="Action in progress" onClick={() => countChanged(value => value + 1)} />
      <output id="contract-count">{count}</output>
      <PressButton id="contract-disabled" label="Unavailable" disabled onClick={() => countChanged(value => value + 1)} />
      <PressButton id="contract-disabled-link" label="Unavailable link" href="#should-not-open" disabled onClick={() => countChanged(value => value + 1)} />
      <PressButton id="contract-pending-link" label="Pending link" href="#should-not-open" pending onClick={() => countChanged(value => value + 1)} />
      {(['sm', 'md', 'lg'] as const).map(size => <PressButton key={size} className={`contract-size-${size}`} label={'Длинное название действия '.repeat(5)} size={size} />)}
      {['#777777', '#000000', '#FFFFFF', '#EBD183', '#3569ED'].map(accent => <PressButton key={accent} className="contract-color" label="Readable action" accent={accent} />)}
      <div id="contract-dark-tabs"><ContentTabs label="Dark accent sections" accent="#0D0C09" tabs={tabs} /></div>
      <div id="contract-uncontrolled"><ContentTabs label="Uncontrolled sections" defaultValue="second" tabs={tabs} /></div>
      <div id="contract-controlled"><ContentTabs label="Controlled sections" value={controlled} onValueChange={id => changes.push(id)} tabs={tabs} /></div>
      <div id="contract-vertical"><ContentTabs label="Vertical sections" orientation="vertical" tabs={tabs} /></div>
      <button id="contract-after" type="button">After examples</button>
    </>;
  }
  root.render(<StrictMode><Harness /></StrictMode>);
  return { changes, pending: (value: boolean) => setPending(value), controlled: (value: string) => setControlled(value), items: (value: string[]) => setItems(value), unmount: () => { root.unmount(); host.remove(); if (app) app.style.display = ''; } };
}
