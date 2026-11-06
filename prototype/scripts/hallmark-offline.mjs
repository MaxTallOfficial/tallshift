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
if(args.length>1||args.some(x=>x.startsWith('-')))throw new Error('Usage: node prototype/scripts/hallmark-offline.mjs [prototype/src/subdirectory]');
const source=realpathSync(resolve(root,args[0]||'prototype/src/product'));
const allowed=realpathSync(resolve(root,'prototype/src'));
if(source!==allowed&&!source.startsWith(allowed+sep))throw new Error('Only prototype/src source checks are allowed');
if(process.platform!=='darwin'||!existsSync('/usr/bin/sandbox-exec'))throw new Error('Network sandbox unavailable; refusing to execute Hallmark');
const skillReads=Object.keys(manifest.sha256).map(file=>`--allow-fs-read=${resolve(skill,file)}`);
const childArgs=['--permission',...skillReads,`--allow-fs-read=${allowed}`,`--allow-fs-read=${resolve(root,'prototype/package.json')}`,resolve(skill,'scripts/sloplint.mjs'),source,'--scope','app','--genre','modern-minimal'];
const result=spawnSync('/usr/bin/sandbox-exec',['-p','(version 1)(allow default)(deny network*)',process.execPath,...childArgs],{
 cwd:root,env:{PATH:'/usr/bin:/bin',LANG:'en_US.UTF-8',TZ:'UTC'},stdio:'inherit',timeout:30000,
});
if(result.error)throw result.error;
if(result.signal)throw new Error(`Hallmark terminated: ${result.signal}`);
process.exitCode=result.status??1;
