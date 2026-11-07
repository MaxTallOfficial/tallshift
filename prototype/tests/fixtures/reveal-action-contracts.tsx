import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ContentReveal } from '../../src/recipes/content-reveal/ContentReveal';
import { ActionBand } from '../../src/recipes/starter-action-band/ActionBand';

/** Exercise the exported APIs independently of their product demonstrations. */
export function mountContracts() {
  const host = document.createElement('div');
  host.id = 'reveal-action-contracts';
  host.style.cssText = 'padding:16px;box-sizing:border-box;max-width:100%';
  document.body.append(host);
  const app = document.getElementById('root');
  if (app) app.style.display = 'none';
  const calls: { instance: string; duration: number }[] = [];
  const cancelled: string[] = [];
  const original = Element.prototype.animate;
  Element.prototype.animate = function (...args) {
    const animation = original.apply(this, args);
    if (this.matches('.contract-reveal-a,.contract-reveal-b')) {
      const instance = this.classList.contains('contract-reveal-a') ? 'a' : 'b';
      const options = args[1];
      calls.push({ instance, duration: typeof options === 'number' ? options : Number(options?.duration) });
      const cancel = animation.cancel.bind(animation);
      animation.cancel = () => { cancelled.push(instance); cancel(); };
    }
    return animation;
  };
  let changeOptions: (value: { motion: 'off' | 'subtle' | 'expressive'; duration: number }) => void = () => {};
  function Harness() {
    const [options, setOptions] = useState<{ motion: 'off' | 'subtle' | 'expressive'; duration: number }>({ motion: 'expressive', duration: 600 });
    const [count, setCount] = useState(0);
    changeOptions = setOptions;
    return <>
      {(['a', 'b'] as const).map(instance => <div key={instance} id={`contract-scroll-${instance}`} style={{ position: 'relative', overflow: 'auto', height: 180, marginBottom: 24 }} tabIndex={0}>
        <div style={{ height: 220 }}>Scroll to the local content</div>
        <ContentReveal className={`contract-reveal-${instance}`} once={false} {...options}>
          <p>Content remains available without animation.</p><button id={`contract-reveal-focus-${instance}`} type="button">Read local content</button>
        </ContentReveal>
      </div>)}
      <div id="contract-band-no-note"><ActionBand title={'Длинный заголовок раздела '.repeat(4)} description={'Связанное описание для проверки узкого экрана. '.repeat(3)} note="   " action={{ label: 'Run local action', onClick: () => setCount(value => value + 1) }} /></div>
      <output id="contract-band-count">{count}</output>
      <div id="contract-band-link"><ActionBand title="A native link" description="The host provides a destination." action={{ label: 'Open destination', href: '#contract-destination' }} note="Keep this note." /></div>
      <div id="contract-band-blocked"><ActionBand title="Unavailable action" description="This button cannot change the counter." action={{ label: 'Unavailable', disabled: true, onClick: () => setCount(value => value + 1) }} /></div>
      {['#000000', '#FFFFFF', '#777777', '#EBD183'].map(surface => <div className="contract-band-surface" key={surface}><ActionBand surface={surface} title="Readable title" description="Readable description" action={{ label: 'Local action', onClick: () => {} }} /></div>)}
      <p id="contract-destination">The local destination.</p>
    </>;
  }
  const root = createRoot(host);
  root.render(<StrictMode><Harness /></StrictMode>);
  return { calls, cancelled, options: (value: { motion: 'off' | 'subtle' | 'expressive'; duration: number }) => changeOptions(value), unmount: () => { root.unmount(); Element.prototype.animate = original; host.remove(); if (app) app.style.display = ''; } };
}
