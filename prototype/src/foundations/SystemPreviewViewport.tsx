import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { SystemSegmentedControl } from './SystemSegmentedControl';
import { SystemButton } from './SystemButton';
import { SystemIcon } from './SystemIcon';
import type { Locale } from './copy';
import './system-preview-viewport.css';

export type SystemPreviewWidth = 'full' | 'tablet' | 'mobile';
export interface SystemPreviewViewportProps {
  locale: Locale;
  label: string;
  children: ReactNode;
  width: SystemPreviewWidth;
  onWidthChange: (width: SystemPreviewWidth) => void;
  motionOff?: boolean;
  onReset?: () => void;
}

const copy = {
  en: { width: 'Preview width', full: 'Full width',compact:'Auto', tablet: 'Tablet · 640', mobile: 'Mobile · 320', reset: 'Reset preview', note: 'The preview has its own document and viewport. Preset widths shrink to fit the available space.', actual: 'Actual viewport', scope: 'Trusted local React example. This frame does not run uploaded HTML or scripts.' },
  ru: { width: 'Ширина превью', full: 'По ширине',compact:'Авто', tablet: 'Планшет · 640', mobile: 'Телефон · 320', reset: 'Сбросить превью', note: 'Превью открыто в отдельном документе со своей областью просмотра. Выбранная ширина уменьшается, если места меньше.', actual: 'Фактическая область', scope: 'Доверенный локальный пример React. Этот фрейм не запускает загруженный HTML и скрипты.' },
  vi: { width: 'Chiều rộng bản xem thử', full: 'Toàn chiều rộng',compact:'Auto', tablet: 'Máy tính bảng · 640', mobile: 'Điện thoại · 320', reset: 'Đặt lại bản xem', note: 'Bản xem thử có tài liệu và vùng xem riêng. Chiều rộng sẽ thu nhỏ để vừa không gian có sẵn.', actual: 'Vùng xem thực tế', scope: 'Ví dụ React cục bộ đáng tin cậy. Khung này không chạy HTML hay mã lệnh được tải lên.' },
} satisfies Record<Locale, Record<string, string>>;

// Only a fixed empty document is parsed. Trusted React children are rendered by the parent.
const frameDocument = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="system-preview-root" class="system-study sv-frame-root"></div></body></html>';
const frameReset = 'html,body{margin:0!important;min-height:0!important;height:auto!important;width:100%;background:transparent!important;overflow:visible}#system-preview-root.system-study{display:flow-root;box-sizing:border-box;min-height:0!important;height:auto!important;width:100%;padding:8px;background:transparent!important}#system-preview-root *,#system-preview-root *::before,#system-preview-root *::after{box-sizing:border-box}';

/** Document/CSS/viewport isolation for trusted local React examples; not an untrusted-code runner. */
export function SystemPreviewViewport({ locale, label, children, width, onWidthChange, motionOff = false, onReset }: SystemPreviewViewportProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const heights = useRef(new Map<string, number>());
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [revision, setRevision] = useState(0);
  const [height, setHeight] = useState(440);
  const [actualWidth, setActualWidth] = useState(0);
  const t = copy[locale];

  function ready() {
    const doc = frameRef.current?.contentDocument;
    const host = rootRef.current?.ownerDocument;
    const container = doc?.getElementById('system-preview-root');
    if (!doc || !host || !container) return;
    // Reuse the already authored local CSS, including CSS Module names and embedded fonts.
    const base = doc.createElement('base');
    base.href = host.baseURI;
    doc.head.append(base);
    host.querySelectorAll<HTMLStyleElement | HTMLLinkElement>('style,link[rel="stylesheet"]').forEach(node => {
      if (node.tagName === 'LINK') {
        const url = new URL((node as HTMLLinkElement).href, host.baseURI);
        if (url.origin !== host.location.origin && url.protocol !== 'data:' && url.protocol !== 'blob:') return;
      }
      doc.head.append(node.cloneNode(true));
    });
    const reset = doc.createElement('style');
    reset.textContent = frameReset;
    doc.head.append(reset);
    setTarget(container);
  }

  useLayoutEffect(() => {
    if (!target || !rootRef.current) return;
    const doc = target.ownerDocument;
    const computed = getComputedStyle(rootRef.current);
    for (let index = 0; index < computed.length; index++) {
      const name = computed[index];
      if (name.startsWith('--')) target.style.setProperty(name, computed.getPropertyValue(name));
    }
    target.style.fontFamily = computed.fontFamily;
    target.style.color = computed.color;
    target.dataset.motion = motionOff ? 'off' : 'on';
    doc.documentElement.lang = locale;
    doc.documentElement.dataset.motion = motionOff ? 'off' : 'on';
    doc.title = label;
  }, [target, locale, label, motionOff, children]);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!target || !frame) return;
    const measure = () => {
      const measuredWidth = Math.round(frame.getBoundingClientRect().width);
      const key = `${locale}-${width}-${measuredWidth}`;
      const measured = Math.ceil(Math.max(target.scrollHeight, target.getBoundingClientRect().height));
      const reserve = Math.max(440, heights.current.get(key) ?? 0, measured);
      heights.current.set(key, reserve);
      setHeight(previous => previous === reserve ? previous : reserve);
      setActualWidth(previous => previous === measuredWidth ? previous : measuredWidth);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    observer.observe(frame);
    measure();
    const fonts = target.ownerDocument.fonts;
    fonts.addEventListener('loadingdone', measure);
    return () => { observer.disconnect(); fonts.removeEventListener('loadingdone', measure); };
  }, [target, locale, width]);

  useEffect(() => () => { heights.current.clear(); }, []);

  return <div ref={rootRef} className="sv-viewport" data-motion={motionOff ? 'off' : 'on'}>
    <div className="sv-toolbar"><SystemSegmentedControl label={t.width} value={width} onChange={onWidthChange} options={[{ value:'full',ariaLabel:t.full,label:<><span className="sv-wide-label">{t.full}</span><span className="sv-compact-label">{t.compact}</span></> }, { value:'tablet',ariaLabel:t.tablet,label:<><span className="sv-wide-label">{t.tablet}</span><span className="sv-compact-label">640</span></> }, { value:'mobile',ariaLabel:t.mobile,label:<><span className="sv-wide-label">{t.mobile}</span><span className="sv-compact-label">320</span></> }]} /><SystemButton className="sv-reset" leadingIcon={<SystemIcon name="replay" size={20}/>} onClick={() => { setRevision(previous => previous + 1); onReset?.(); }}>{t.reset}</SystemButton></div>
    <p className="sv-note" id={`${id}-note`}>{t.note}</p>
    <div className="sv-stage"><div className="sv-screen" style={{ maxWidth: width === 'mobile' ? 320 : width === 'tablet' ? 640 : '100%' }}><iframe ref={frameRef} className="sv-frame" title={label} aria-describedby={`${id}-note`} srcDoc={frameDocument} sandbox="allow-same-origin" onLoad={ready} style={{ height }} />{target && createPortal(<div key={revision} className="sv-frame-content">{children}</div>, target)}</div></div>
    <p className="sv-dimensions"><span>{t.actual}</span><span>{actualWidth || '—'} × {height} px</span></p>
    <p className="sv-scope">{t.scope}</p>
  </div>;
}
