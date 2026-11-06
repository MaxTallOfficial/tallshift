import { IntegrationGuide } from '../foundations/IntegrationGuide';
import { SystemDisclosureIcon } from '../foundations/SystemDisclosureIcon';
import type { RecipeFile, RecipeLocale } from '../recipes/state-relay';

type PromptDocumentProps = {
  prompt: string;
  locale?: RecipeLocale;
  files: RecipeFile[];
};

const labels = {
  ru: {
    kicker: 'Запрос для ИИ', task: 'Что должен сделать ИИ', rules: 'Требования к внедрению',
    configuration: 'Настройки примера', context: 'Информация о проекте',
    contextNote: 'Включено в текст запроса при копировании.',
    included: 'В запрос включены все файлы кода и инструкция.',
    sources: 'Файлы кода в запросе', guide: 'Инструкция подключения',
    full: 'Полный текст запроса', fullNote: 'При копировании в буфер обмена попадает весь этот текст. Его также можно выделить вручную.',
    configMarker: 'Выбранная конфигурация:', sourceMarker: 'Полные локальные исходники',
  },
  en: {
    kicker: 'AI request', task: 'What the AI should do', rules: 'Integration requirements',
    configuration: 'Example settings', context: 'Your project details',
    contextNote: 'Included in the request you copy.',
    included: 'The request includes all source files and the setup guide.',
    sources: 'Included source files', guide: 'Installation guide',
    full: 'Full request text', fullNote: 'This is the full text copied to the clipboard. You can also select it manually.',
    configMarker: 'Selected configuration:', sourceMarker: 'Complete local source',
  },
  vi: {
    kicker: 'Yêu cầu cho AI', task: 'AI cần làm gì', rules: 'Yêu cầu khi tích hợp',
    configuration: 'Thiết lập ví dụ', context: 'Thông tin dự án của bạn',
    contextNote: 'Được thêm vào yêu cầu khi sao chép.',
    included: 'Yêu cầu gồm toàn bộ tệp mã nguồn và hướng dẫn cài đặt.',
    sources: 'Mã nguồn đi kèm', guide: 'Hướng dẫn tích hợp',
    full: 'Toàn bộ yêu cầu', fullNote: 'Đây là toàn bộ nội dung được sao chép vào bộ nhớ tạm. Bạn cũng có thể chọn văn bản để sao chép thủ công.',
    configMarker: 'Cấu hình đã chọn:', sourceMarker: 'Toàn bộ mã nguồn cục bộ',
  },
};

/** The readable view is derived from the same string that the parent copies. */
export function PromptDocument({ prompt, locale = 'en', files }: PromptDocumentProps) {
  const t = labels[locale];
  const configAt = prompt.indexOf(`\n\n${t.configMarker}\n`);
  const sourceAt = prompt.indexOf(`\n\n${t.sourceMarker}\n`);
  const introEnd = configAt >= 0 ? configAt : sourceAt >= 0 ? sourceAt : prompt.length;
  const paragraphs = prompt.slice(0, introEnd).split(/\n\s*\n/).filter(Boolean);
  const configStart = configAt < 0 ? -1 : configAt + t.configMarker.length + 3;
  const configEnd = configStart < 0 ? -1 : prompt.indexOf('\n\n', configStart);
  let configuration = configStart < 0 ? '' : prompt.slice(configStart, configEnd < 0 ? undefined : configEnd);
  try { configuration = JSON.stringify(JSON.parse(configuration), null, 2); } catch { /* Keep the actual text if a future prompt format changes. */ }

  let context = '';
  const contextLine = prompt.slice(0, sourceAt < 0 ? undefined : sourceAt).match(/^CONTEXT_JSON=(.*)$/m);
  if (contextLine) {
    try { const value: unknown = JSON.parse(contextLine[1]); if (typeof value === 'string') context = value; } catch { /* The complete source text remains available below. */ }
  }
  const sources = files.filter(file => /\.(tsx?|css)$/.test(file.path));
  const guideAt = sourceAt < 0 ? -1 : prompt.lastIndexOf('\n\n# State Relay / A001 — ');
  const guide = guideAt > sourceAt ? prompt.slice(guideAt + 2) : '';

  return <article className="pd-document" aria-label={t.kicker}>
    <p className="pd-kicker">{t.kicker}</p>
    <section className="pd-section">
      <h3>{t.task}</h3>
      {paragraphs[0] && <p className="pd-lead">{paragraphs[0]}</p>}
    </section>
    {paragraphs.length > 1 && <section className="pd-section">
      <h3>{t.rules}</h3>
      <div className="pd-prose">{paragraphs.slice(1).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
    </section>}
    {configuration && <section className="pd-section">
      <h3>{t.configuration}</h3>
      <pre className="pd-config" tabIndex={0}><code>{configuration}</code></pre>
    </section>}
    {context && <section className="pd-section">
      <h3>{t.context}</h3>
      <p className="pd-note">{t.contextNote}</p>
      <div className="pd-prose">{context.split('\n').map((line, index) => <span key={index}>{index > 0 && <br />}{line}</span>)}</div>
    </section>}
    <p className="pd-note">{t.included}</p>
    <details className="pd-sources">
      <summary><SystemDisclosureIcon/>{t.sources} <span>({sources.length})</span></summary>
      {sources.map(file => <details className="pd-file" key={file.path}>
        <summary><SystemDisclosureIcon/>{file.path}</summary>
        <pre tabIndex={0}><code>{file.content}</code></pre>
      </details>)}
    </details>
    {guide && <details className="pd-sources">
      <summary><SystemDisclosureIcon/>{t.guide}</summary>
      <div className="pd-prose"><IntegrationGuide source={guide}/></div>
    </details>}
    <details className="pd-full">
      <summary><SystemDisclosureIcon/>{t.full}</summary>
      <p className="pd-note">{t.fullNote}</p>
      <pre tabIndex={0}>{prompt}</pre>
    </details>
  </article>;
}
