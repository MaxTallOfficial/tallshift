import {useEffect,useState} from 'react';
import {SystemButton} from '../foundations/SystemButton';
import {SystemIcon} from '../foundations/SystemIcon';
import {docsTopics,docsPromptTemplates,docsGlossary,docsChangelog,docsUiCopy} from './docs-content';
import type {ProductLocale} from './routes';
import './docs.css';

function PromptCopy({text,locale}: {text: string;locale: ProductLocale}) {
  const [state,setState] = useState<'idle'|'copied'|'failed'>('idle');
  useEffect(()=>setState('idle'),[text]);
  const t = docsUiCopy[locale];
  return <><SystemButton leadingIcon={<SystemIcon name="copy"/>} onClick={async()=>{try {await navigator.clipboard.writeText(text);setState('copied');} catch {setState('failed');}}}>{t.copy}</SystemButton><p role="status">{state==='copied'?t.copied:state==='failed'?t.copyFailed:''}</p></>;
}
export function DocsPage({locale,slug}: {locale: ProductLocale;slug?: string}) {
  const t = docsUiCopy[locale];
  const topic = docsTopics.find(item=>item.slug===slug);
  const template = docsPromptTemplates.find(item=>`ai-template-${item.slug}`===slug);
  const base = `/${locale}/docs`;
  if (slug && !topic && !template) return <section className="td-page"><h1>404</h1><a href={base}>{t.back}</a></section>;
  return <div className="td-page">
    {slug ? <article className="td-article"><a className="td-back" href={base}><SystemIcon name="arrow-left" size={16}/>{t.back}</a><header><h1>{topic?.title[locale]??template?.title[locale]}</h1><p className="td-lead">{topic?.summary[locale]??template?.summary[locale]}</p></header>
      {topic?.sections[locale].map(section=><section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map(p=><p key={p}>{p}</p>)}{section.steps&&<ol>{section.steps.map(step=><li key={step}>{step}</li>)}</ol>}{section.code&&<pre tabIndex={0}><code>{section.code}</code></pre>}</section>)}
      {template&&<section><pre tabIndex={0}><code>{template.prompt[locale]}</code></pre><PromptCopy text={template.prompt[locale]} locale={locale}/></section>}
      <a className="system-button" data-variant="secondary" href={`/${locale}/library/state-relay`}>{t.openExample}<SystemIcon name="arrow-right" size={20}/></a>
    </article> : <>
      <header><h1>{t.title}</h1><p className="td-lead">{t.lead}</p></header>
      <section aria-labelledby="docs-topics"><h2 id="docs-topics">{t.topicsLabel}</h2><ul className="td-index">{docsTopics.map(item=><li key={item.slug}><a href={`${base}/${item.slug}`}><h3>{item.title[locale]}</h3><p>{item.summary[locale]}</p><SystemIcon name="arrow-right" size={20}/></a></li>)}</ul></section>
      <section aria-labelledby="docs-prompts"><h2 id="docs-prompts">{t.promptsLabel}</h2><ul className="td-index">{docsPromptTemplates.map(item=><li key={item.slug}><a href={`${base}/ai-template-${item.slug}`}><h3>{item.title[locale]}</h3><p>{item.summary[locale]}</p><SystemIcon name="arrow-right" size={20}/></a></li>)}</ul></section>
      <section aria-labelledby="docs-glossary"><h2 id="docs-glossary">{t.glossaryLabel}</h2><dl className="td-glossary">{docsGlossary.map(item=><div key={item.term}><dt>{item.term}</dt><dd>{item.definition[locale]}</dd></div>)}</dl></section>
      <section aria-labelledby="docs-changelog"><h2 id="docs-changelog">{t.changelogLabel}</h2>{docsChangelog.map(item=><article className="td-change" key={item.date}><time dateTime={item.date}>{new Intl.DateTimeFormat(locale,{dateStyle:'long',timeZone:'UTC'}).format(new Date(`${item.date}T00:00:00Z`))}</time><h3>{item.title[locale]}</h3>{item.paragraphs[locale].map(p=><p key={p}>{p}</p>)}</article>)}</section>
    </>}
  </div>;
}
