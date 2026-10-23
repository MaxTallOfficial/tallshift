import type { RecipeFile, RecipeLocale } from '../recipes/state-relay';

type PromptDocumentProps = {
  prompt: string;
  locale?: RecipeLocale;
  files: RecipeFile[];
};

const labels = {
  ru: {
    kicker: 'Промпт адаптации', task: 'Задача', rules: 'Требования к внедрению',
    configuration: 'Выбранная конфигурация', context: 'Контекст вашего проекта',
    contextNote: 'Включено в промпт для копирования.',
    included: 'В копируемый промпт включены полные исходники и инструкция.',
    sources: 'Включённые исходники', guide: 'Инструкция подключения',
    full: 'Полный текст промпта', fullNote: 'Этот текст копирует кнопка «Скопировать промпт». Его также можно выделить вручную.',
    configMarker: 'Выбранная конфигурация:', sourceMarker: 'Полные локальные исходники',
  },
  en: {
    kicker: 'Adaptation prompt', task: 'Task', rules: 'Integration requirements',
    configuration: 'Selected configuration', context: 'Your project context',
    contextNote: 'Included in the prompt you copy.',
    included: 'The copied prompt includes the complete source and installation guide.',
    sources: 'Included source files', guide: 'Installation guide',
    full: 'Complete prompt text', fullNote: 'This is the exact text copied by “Copy prompt”. You can also select it manually.',
    configMarker: 'Selected configuration:', sourceMarker: 'Complete local source',
  },
  vi: {
    kicker: 'Prompt tùy chỉnh', task: 'Yêu cầu', rules: 'Yêu cầu khi tích hợp',
    configuration: 'Cấu hình đã chọn', context: 'Ngữ cảnh dự án của bạn',
    contextNote: 'Được thêm vào prompt khi sao chép.',
    included: 'Prompt được sao chép bao gồm toàn bộ mã nguồn và hướng dẫn cài đặt.',
    sources: 'Mã nguồn đi kèm', guide: 'Hướng dẫn tích hợp',
    full: 'Toàn bộ prompt', fullNote: 'Đây là nội dung nút «Sao chép prompt» sẽ sao chép. Bạn cũng có thể chọn văn bản để sao chép thủ công.',
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
      <summary>{t.sources} <span>({sources.length})</span></summary>
      {sources.map(file => <details className="pd-file" key={file.path}>
        <summary>{file.path}</summary>
        <pre tabIndex={0}><code>{file.content}</code></pre>
      </details>)}
    </details>
    {guide && <details className="pd-sources">
      <summary>{t.guide}</summary>
      <div className="pd-prose">{guide.split(/(```[\s\S]*?```)/g).map((part, partIndex) => {
        const fenced = part.match(/^```[^\n]*\n([\s\S]*?)\n```$/);
        if (fenced) return <pre className="pd-config" tabIndex={0} key={partIndex}><code>{fenced[1]}</code></pre>;
        return part.split(/\n\s*\n/).filter(Boolean).map((paragraph, paragraphIndex) => paragraph.startsWith('# ')
          ? <h4 key={`${partIndex}-${paragraphIndex}`}>{paragraph.slice(2)}</h4>
          : <p key={`${partIndex}-${paragraphIndex}`}>{paragraph}</p>);
      })}</div>
    </details>}
    <details className="pd-full">
      <summary>{t.full}</summary>
      <p className="pd-note">{t.fullNote}</p>
      <pre tabIndex={0}>{prompt}</pre>
    </details>
  </article>;
}
