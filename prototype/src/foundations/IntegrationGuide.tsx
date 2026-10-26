/** A small, text-only renderer for our bundled guide. No raw HTML or remote links. */
export function IntegrationGuide({ source }: { source: string }) {
 return <div className="sy-integration-guide">{source.split(/(```[\s\S]*?```)/g).flatMap((part,index) => {
  if (part.startsWith('```')) return [<pre key={index}><code>{part.replace(/^```[^\n]*\n/,'').replace(/```$/,'').trimEnd()}</code></pre>];
  return part.split(/\n\s*\n/).filter(Boolean).map((block,offset) => {
   const text=block.trim();
   if (/^#\s/.test(text)) return null;
   return /^#{2,3}\s/.test(text) ? <h3 key={`${index}-${offset}`}>{text.replace(/^#+\s/,'')}</h3> : <p key={`${index}-${offset}`}>{text}</p>;
  });
 })}</div>;
}
