/** Tallshift: the only approved Hallmark script entry point. No network or inherited secrets. */
import {spawnSync} from 'node:child_process';
import {readFileSync,realpathSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {homedir} from 'node:os';
import {resolve,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const skill=realpathSync(resolve(homedir(),'.codex/skills/hallmark'));
const manifest=JSON.parse(readFileSync(resolve(root,'.hallmark/security.json'),'utf8'));
for(const [file,expected] of Object.entries(manifest.sha256)) {
 const path=realpathSync(resolve(skill,file));
 if(!path.startsWith(skill+sep))throw new Error('Skill file escapes the audited directory');
 if(createHash('sha256').update(readFileSync(path)).digest('hex')!==expected)throw new Error(`Hallmark changed: review required before execution (${file})`);
}
const args=process.argv.slice(2);
// Only a static source check. No URLs, renderer, captures, installers, hooks, imagegen or arbitrary flags.
if(args.length>1||args.some(x=>x.startsWith('-')))throw new Error('Usage: node prototype/scripts/hallmark-offline.mjs [prototype/src/subdirectory | <TALLSHIFT_PAID_ROOT>/examples/<ID>/src]');
const source=realpathSync(resolve(root,args[0]||'prototype/src/product'));
let allowed=realpathSync(resolve(root,'prototype/src'));
let paidPackages=[];
const inside=(dir,path)=>path===dir||path.startsWith(dir+sep);
if(!inside(allowed,source)){
 // Decision of Max Tall 29.11.2026: paid examples are checked in place, in the private tallshift-paid clone,
 // so paid source never has to be copied into this public repository. Only <TALLSHIFT_PAID_ROOT>/examples/<ID>/src.
 const paidRoot=process.env.TALLSHIFT_PAID_ROOT?realpathSync(process.env.TALLSHIFT_PAID_ROOT):'';
 const readme=paidRoot&&existsSync(resolve(paidRoot,'README.md'))?readFileSync(resolve(paidRoot,'README.md'),'utf8'):'';
 const examples=paidRoot?resolve(paidRoot,'examples'):'';
 const paidSource=examples&&inside(examples,source)&&/^[A-Z]\d{3}\/src(\/|$)/.test(source.slice(examples.length+1));
 if(!paidRoot||!readme.startsWith('# Tallshift — платные примеры')||!paidSource||inside(root,paidRoot))throw new Error('Only prototype/src or <TALLSHIFT_PAID_ROOT>/examples/<ID>/src source checks are allowed');
 const item=resolve(examples,source.slice(examples.length+1).split(sep)[0]);
 allowed=realpathSync(resolve(item,'src'));
 // The checker looks for the nearest package.json; it may read only these, nothing else of the private clone.
 paidPackages=[resolve(item,'package.json'),resolve(examples,'package.json'),resolve(paidRoot,'package.json')];
}
if(process.platform!=='darwin'||!existsSync('/usr/bin/sandbox-exec'))throw new Error('Network sandbox unavailable; refusing to execute Hallmark');
const skillReads=Object.keys(manifest.sha256).map(file=>`--allow-fs-read=${resolve(skill,file)}`);
const childArgs=['--permission',...skillReads,`--allow-fs-read=${allowed}`,`--allow-fs-read=${resolve(root,'prototype/package.json')}`,...paidPackages.map(file=>`--allow-fs-read=${file}`),resolve(skill,'scripts/sloplint.mjs'),source,'--scope','app','--genre','modern-minimal'];
const result=spawnSync('/usr/bin/sandbox-exec',['-p','(version 1)(allow default)(deny network*)',process.execPath,...childArgs],{
 cwd:root,env:{PATH:'/usr/bin:/bin',LANG:'en_US.UTF-8',TZ:'UTC'},stdio:'inherit',timeout:30000,
});
if(result.error)throw result.error;
if(result.signal)throw new Error(`Hallmark terminated: ${result.signal}`);
process.exitCode=result.status??1;
