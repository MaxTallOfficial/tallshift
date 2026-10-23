import { readFile,writeFile } from 'node:fs/promises';
import { accents,directions,createTokens } from './tokens.mjs';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
let html=await read('index.html');
let css=await read('style.css')+'\n'+await read('specimens.css');
for(const name of ['Manrope','Unbounded','GolosText']){
  const bytes=await readFile(new URL(`assets/fonts/${name}.ttf`,import.meta.url));
  css=css.replace(`url('./assets/fonts/${name}.ttf')`,`url('data:font/ttf;base64,${bytes.toString('base64')}')`);
}
const code=[await read('tokens.mjs'),await read('specimens.js'),await read('app.mjs')].join('\n').replace(/^import .+;\s*$/gm,'').replace(/^export /gm,'');
html=html.replace('<link rel="stylesheet" href="style.css"><link rel="stylesheet" href="specimens.css">',`<style>${css}</style>`).replace('<script type="module" src="app.mjs"></script>',`<script type="module">${code.replaceAll('</script','<\\/script')}</script>`);
const licenses=await Promise.all(['Manrope','Unbounded','GolosText'].map(name=>read(`assets/fonts/${name}-OFL.txt`)));
html=html.replace('</head>',`<!-- Local fonts: Manrope / Unbounded / Golos Text. Their OFL notices follow.\n${licenses.join('\n\n').replaceAll('--','—')}\n--></head>`);
await writeFile(new URL('review.html',import.meta.url),html);
const variants=[];
for(const direction of Object.keys(directions))for(const accent of accents)variants.push(createTokens(direction,accent.id));
const componentAliases={button:{primary:{background:'color.accent',foreground:'color.onAccent',hover:'color.accentHover',focus:'color.focus'},secondary:{background:'color.surface',foreground:'color.text',border:'color.border'},radius:'control.radius',minHit:'control.minHit'},input:{background:'color.background',foreground:'color.text',placeholder:'color.textSecondary',border:'color.border',error:'color.error',radius:'control.radius'},card:{surface:'color.surface',border:'color.divider',selectedOutline:'color.selectedBorder',radius:'control.radiusPanel'},dialog:{background:'color.surface',foreground:'color.text',radius:'control.radiusDialog',layer:'layer.dialog'},toast:{foreground:'color.text',surface:'color.surface',success:'color.success',error:'color.error',layer:'layer.toast'},tabs:{foreground:'color.textSecondary',selectedForeground:'color.text',selectedSurface:'color.surface',motion:'motion.selection'}};
await writeFile(new URL('tokens.candidates.json',import.meta.url),JSON.stringify({schemaVersion:'0.1.0',status:'candidate-not-approved',format:'Formrift internal token format',accents,componentAliases,variants},null,2)+'\n');
console.log(JSON.stringify({standalone:'review.html',bytes:Buffer.byteLength(html),themeAccentCandidates:variants.length,status:'candidate-not-approved'}));
