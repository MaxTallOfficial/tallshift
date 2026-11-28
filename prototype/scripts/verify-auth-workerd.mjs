#!/usr/bin/env node
// Full sign-in scenario in the real Workers runtime (wrangler dev + workerd) with a local D1 and no network:
// registration → verification email → verify → sign-in → sign out everywhere → password reset → account deletion,
// in RU, EN and VI, plus API error cases. Unit tests run in Node and cannot catch runtime-only failures, such as the
// fetch redirect mode that broke production emails on 27.11.2026.
// Nothing leaves the machine: the harness worker replaces fetch, captures the mail request and blocks everything else.
// Passwords and link tokens are random per run and are never printed. Usage: node scripts/verify-auth-workerd.mjs
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const wranglerBin = join(root, 'node_modules/wrangler/bin/wrangler.js');
const production = readFileSync(join(root, 'wrangler.production.jsonc'), 'utf8');
const compatibilityDate = production.match(/"compatibility_date"\s*:\s*"([^"]+)"/)?.[1];
const compatibilityFlags = [...(production.match(/"compatibility_flags"\s*:\s*\[([^\]]*)\]/)?.[1] ?? '').matchAll(/"([^"]+)"/g)].map((match) => match[1]);
const ORIGIN = 'https://tallshift.test';
const MAIL_URL = 'https://mail.tallshift.test/emails';
const FROM = 'Tallshift <no-reply@tallshift.test>';
const MAIL_KEY = 'local-test-key';
// Production has 0001 and 0002 applied; 0003 is not applied yet, so the local database mirrors that.
const MIGRATIONS = ['0001_ton_payments.sql', '0002_auth.sql'];
const port = 8800 + Math.floor(Math.random() * 150);
const base = `http://127.0.0.1:${port}`;
const childEnv = { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' };

const work = mkdtempSync(join(tmpdir(), 'tallshift-auth-e2e-'));
mkdirSync(join(work, 'migrations'));
for (const file of MIGRATIONS) copyFileSync(join(root, 'migrations', file), join(work, 'migrations', file));
writeFileSync(join(work, 'opennext-stub.mjs'), 'export function getCloudflareContext(){throw new Error("unused in the auth harness");}\n');
writeFileSync(join(work, 'worker.mjs'), `import {handleAuthRequest} from ${JSON.stringify(join(root, 'src/server/auth/handler.ts'))};
const MAIL_URL=${JSON.stringify(MAIL_URL)},MAIL_KEY=${JSON.stringify(MAIL_KEY)};
const mails=[];
globalThis.fetch=async(input,init)=>{
  // new Request parses the init the same way the runtime fetch does; nothing is sent anywhere.
  const request=new Request(input,init);
  if(request.url!==MAIL_URL)return new Response('blocked by the local harness',{status:599});
  mails.push({authorized:request.headers.get('authorization')==='Bearer '+MAIL_KEY,body:await request.json()});
  return Response.json({id:'local-'+mails.length});
};
function redirectErrorProbe(){try{new Request('https://probe.test/',{redirect:'error'});return 'accepted';}catch{return 'rejected';}}
export default {async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/__e2e/mails')return Response.json(mails);
  if(url.pathname==='/__e2e/probe')return Response.json({redirectError:redirectErrorProbe()});
  if(url.pathname==='/__e2e/leftovers')return Response.json(await env.DB.prepare('SELECT (SELECT count(*) FROM auth_user WHERE email=?1) AS users,(SELECT count(*) FROM auth_session WHERE user_id NOT IN (SELECT id FROM auth_user)) AS sessions,(SELECT count(*) FROM auth_action_tokens WHERE user_id NOT IN (SELECT id FROM auth_user)) AS tokens,(SELECT count(*) FROM auth_account WHERE user_id NOT IN (SELECT id FROM auth_user)) AS credentials').bind(url.searchParams.get('email')).first());
  return handleAuthRequest(request,env);
}};
`);
writeFileSync(join(work, 'wrangler.json'), JSON.stringify({
  name: 'tallshift-auth-e2e',
  main: 'worker.mjs',
  compatibility_date: compatibilityDate,
  compatibility_flags: compatibilityFlags,
  alias: { '@opennextjs/cloudflare': join(work, 'opennext-stub.mjs') },
  d1_databases: [{ binding: 'DB', database_name: 'auth-e2e', database_id: '00000000-0000-4000-8000-000000000000', migrations_dir: 'migrations' }],
  vars: { AUTH_ENABLED: 'true', APP_URL: ORIGIN, AUTH_SECRET: randomBytes(32).toString('hex'), AUTH_EMAIL_FROM: FROM, AUTH_EMAIL_API_URL: MAIL_URL, AUTH_EMAIL_API_KEY: MAIL_KEY },
}, null, 2));

const secret = () => `${randomBytes(18).toString('base64url')}Aa1-`;
const status = (response) => `${response.status}${response.data?.code ? ` ${response.data.code}` : ''}`;
let mails = [];

class Client {
  jar = new Map();
  clone() {
    const copy = new Client();
    copy.jar = new Map(this.jar);
    return copy;
  }
  absorb(response) {
    for (const header of response.headers.getSetCookie()) {
      const [pair, ...attributes] = header.split(';');
      const index = pair.indexOf('=');
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      const expired = attributes.some((attribute) => /^\s*max-age\s*=\s*0\s*$/i.test(attribute));
      if (!value || expired) this.jar.delete(name);
      else this.jar.set(name, value);
    }
  }
  async raw(path, body, { csrf, origin = ORIGIN, method = 'POST' } = {}) {
    const headers = { 'content-type': 'application/json', origin, 'sec-fetch-site': 'same-origin' };
    if (this.jar.size) headers.cookie = [...this.jar].map(([name, value]) => `${name}=${value}`).join('; ');
    if (csrf) headers['x-csrf-token'] = csrf;
    const response = await fetch(`${base}/api/auth/${path}`, { method, headers, body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined });
    this.absorb(response);
    let data = null;
    try { data = await response.json(); } catch { /* empty body */ }
    mails = await (await fetch(`${base}/__e2e/mails`)).json();
    return { status: response.status, data };
  }
  async call(path, body) {
    const challenge = await this.raw('csrf', {});
    return this.raw(path, body, { csrf: challenge.data?.csrfToken });
  }
  async user() {
    return (await this.raw('get-session', null, { method: 'GET' })).data?.user ?? null;
  }
}

const results = [];
function check(name, ok, detail = '') {
  results.push(ok);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`);
}
const lastMailTo = (address) => [...mails].reverse().find((mail) => mail.body?.to === address);
function linkToken(mail, locale, page) {
  const href = mail?.body?.text?.match(/https:\/\/\S+/g)?.find((link) => link.startsWith(`${ORIGIN}/${locale}/auth/${page}?`));
  return href ? new URL(href).searchParams.get('token') : null;
}
const russian = /[А-Яа-яЁё]/;
const vietnamese = /[ạảãàáâầấậẩẫăằắặẳẵẹẻẽèéêềếệểễịỉĩìíọỏõòóôồốộổỗơờớợởỡụủũùúưừứựửữỳýỵỷỹđ]/i;
const english = /^[\x20-\x7E]+$/;

let server;
let serverLog = '';
try {
  const migrate = spawnSync(process.execPath, [wranglerBin, 'd1', 'migrations', 'apply', 'DB', '--local', '--config', 'wrangler.json', '--persist-to', 'state'], { cwd: work, env: childEnv, encoding: 'utf8' });
  if (migrate.status !== 0) throw new Error(`local migrations failed:\n${`${migrate.stdout}${migrate.stderr}`.split('\n').filter((line) => /error|✘/i.test(line)).slice(0, 8).join('\n')}`);
  server = spawn(process.execPath, [wranglerBin, 'dev', '--config', 'wrangler.json', '--persist-to', 'state', '--port', String(port), '--ip', '127.0.0.1', '--show-interactive-dev-session=false'], { cwd: work, env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', (chunk) => { serverLog += chunk; });
  server.stderr.on('data', (chunk) => { serverLog += chunk; });
  let ready = false;
  for (let attempt = 0; attempt < 90 && !ready && server.exitCode === null; attempt += 1) {
    try { ready = (await fetch(`${base}/api/auth/readiness`)).ok; } catch { /* still starting */ }
    if (!ready) await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!ready) throw new Error(`wrangler dev did not start:\n${serverLog.split('\n').filter((line) => /error|✘/i.test(line)).slice(0, 8).join('\n')}`);

  const probe = await (await fetch(`${base}/__e2e/probe`)).json();
  console.log(`info workerd new Request(..., {redirect: "error"}): ${probe.redirectError}`);
  const ru = 'e2e-ru@tallshift.test', en = 'e2e-en@tallshift.test', vi = 'e2e-vi@tallshift.test';
  const password = { ru: secret(), en: secret(), vi: secret() };
  let response, mail;

  response = await new Client().raw('readiness', null, { method: 'GET' });
  check('readiness reports sign-in and email enabled', response.data?.enabled === true && response.data?.emailReady === true, String(response.status));

  // RU: verification, resend, two devices, sign out everywhere. The account stays.
  const deviceA = new Client();
  response = await deviceA.call('sign-up/email', { email: ru, password: password.ru, locale: 'ru' });
  mail = lastMailTo(ru);
  check('RU sign-up answers ok and sends one email', response.status === 200 && mails.length === 1, status(response));
  check('RU email is in Russian and links to /ru/auth/verify-email', !!mail && russian.test(mail.body.subject) && russian.test(mail.body.text) && !!linkToken(mail, 'ru', 'verify-email'));
  let sent = mails.length;
  response = await new Client().call('sign-up/email', { email: ru, password: secret(), locale: 'ru' });
  check('RU repeated sign-up answers the same and sends nothing', response.status === 200 && response.data?.ok === true && mails.length === sent, status(response));
  response = await deviceA.call('sign-in/email', { email: ru, password: password.ru });
  check('RU sign-in before confirmation is refused', response.status === 403 && response.data?.code === 'EMAIL_NOT_VERIFIED', status(response));
  response = await deviceA.call('send-verification-email', { email: ru, locale: 'ru' });
  mail = lastMailTo(ru);
  check('RU "send again" sends a new email', response.status === 200 && mails.length === sent + 1, status(response));
  const verifyToken = linkToken(mail, 'ru', 'verify-email');
  response = await deviceA.call('verify-email', { token: verifyToken });
  check('RU link confirms the email', response.status === 200 && response.data?.ok === true, status(response));
  response = await deviceA.call('verify-email', { token: verifyToken });
  check('RU used link is refused', response.status === 400 && response.data?.code === 'INVALID_TOKEN', status(response));
  response = await deviceA.call('sign-in/email', { email: ru, password: password.ru });
  const userA = await deviceA.user();
  check('RU sign-in on device A shows a confirmed account', response.status === 200 && userA?.email === ru && userA?.emailVerified === true, status(response));
  const deviceB = new Client();
  response = await deviceB.call('sign-in/email', { email: ru, password: password.ru });
  check('RU sign-in on device B', response.status === 200 && !!(await deviceB.user()), status(response));
  const deviceACopy = deviceA.clone();
  response = await deviceA.call('revoke-sessions', {});
  check('RU "sign out everywhere" answers ok', response.status === 200, status(response));
  check('RU device B is signed out by the server', !(await deviceB.user()));
  check('RU device A session is closed on the server too', !(await deviceACopy.user()));

  // EN: sign-out, password reset, old sessions and the used link.
  const english1 = new Client();
  response = await english1.call('sign-up/email', { email: en, password: password.en, locale: 'en' });
  mail = lastMailTo(en);
  check('EN email is in English and links to /en/auth/verify-email', response.status === 200 && !!mail && english.test(mail.body.subject) && !!linkToken(mail, 'en', 'verify-email'), status(response));
  response = await english1.call('verify-email', { token: linkToken(mail, 'en', 'verify-email') });
  check('EN link confirms the email', response.status === 200, status(response));
  response = await english1.call('sign-in/email', { email: en, password: password.en });
  check('EN sign-in', response.status === 200 && !!(await english1.user()), status(response));
  const english1Copy = english1.clone();
  response = await english1.call('sign-out', {});
  check('EN sign-out closes the session on the server', response.status === 200 && !(await english1Copy.user()), status(response));
  const english2 = new Client();
  await english2.call('sign-in/email', { email: en, password: password.en });
  sent = mails.length;
  response = await new Client().call('request-password-reset', { email: en, locale: 'en' });
  mail = lastMailTo(en);
  const resetToken = linkToken(mail, 'en', 'reset-password');
  check('EN reset email links to /en/auth/reset-password', response.status === 200 && mails.length === sent + 1 && !!resetToken && english.test(mail.body.subject), status(response));
  const newPassword = secret();
  response = await new Client().call('reset-password', { token: resetToken, newPassword });
  check('EN new password is saved', response.status === 200, status(response));
  check('EN sessions opened before the reset are closed', !(await english2.user()));
  response = await new Client().call('sign-in/email', { email: en, password: password.en });
  check('EN old password no longer works', response.status === 401 && response.data?.code === 'INVALID_CREDENTIALS', status(response));
  response = await new Client().call('sign-in/email', { email: en, password: newPassword });
  check('EN new password works', response.status === 200, status(response));
  response = await new Client().call('reset-password', { token: resetToken, newPassword: secret() });
  check('EN used reset link is refused', response.status === 400 && response.data?.code === 'INVALID_TOKEN', status(response));

  // VI: account deletion.
  const viet = new Client();
  response = await viet.call('sign-up/email', { email: vi, password: password.vi, locale: 'vi' });
  mail = lastMailTo(vi);
  check('VI email is in Vietnamese and links to /vi/auth/verify-email', response.status === 200 && !!mail && vietnamese.test(mail.body.subject) && !!linkToken(mail, 'vi', 'verify-email'), status(response));
  response = await viet.call('verify-email', { token: linkToken(mail, 'vi', 'verify-email') });
  check('VI link confirms the email', response.status === 200, status(response));
  response = await viet.call('sign-in/email', { email: vi, password: password.vi });
  check('VI sign-in', response.status === 200 && !!(await viet.user()), status(response));
  response = await viet.call('delete-account', { password: secret() });
  check('VI deletion with a wrong password is refused', response.status === 401 && response.data?.code === 'INVALID_CREDENTIALS', status(response));
  const vietCopy = viet.clone();
  response = await viet.call('delete-account', { password: password.vi });
  check('VI account is deleted', response.status === 200 && response.data?.ok === true, status(response));
  check('VI old session no longer works', !(await vietCopy.user()));
  response = await new Client().call('sign-in/email', { email: vi, password: password.vi });
  check('VI sign-in after deletion is refused', response.status === 401 && response.data?.code === 'INVALID_CREDENTIALS', status(response));
  const left = await (await fetch(`${base}/__e2e/leftovers?email=${encodeURIComponent(vi)}`)).json();
  check('VI leaves no user, sessions, link tokens or credentials', left.users === 0 && left.sessions === 0 && left.tokens === 0 && left.credentials === 0, JSON.stringify(left));

  // API errors.
  response = await new Client().raw('csrf', {}, { origin: 'https://evil.example' });
  check('another site cannot get a form token', response.status === 403, status(response));
  response = await new Client().raw('sign-in/email', { email: ru, password: password.ru });
  check('a request without a form token is refused', response.status === 403 && response.data?.code === 'INVALID_CSRF', status(response));
  response = await new Client().call('sign-up/email', { email: 'not-an-email', password: secret(), locale: 'en' });
  check('an invalid email is refused', response.status === 400 && response.data?.code === 'INVALID_INPUT', status(response));
  sent = mails.length;
  response = await new Client().call('request-password-reset', { email: 'nobody@tallshift.test', locale: 'en' });
  check('reset for an unknown address answers ok and sends nothing', response.status === 200 && mails.length === sent, status(response));
  response = await new Client().call('send-verification-email', { email: 'nobody@tallshift.test', locale: 'en' });
  check('"send again" for an unknown address answers ok and sends nothing', response.status === 200 && mails.length === sent, status(response));
  response = await new Client().call('verify-email', { token: 'A'.repeat(43) });
  check('a made-up link token is refused', response.status === 400 && response.data?.code === 'INVALID_TOKEN', status(response));
  response = await new Client().call('delete-account', { password: secret() });
  check('deletion without a session is refused', response.status === 401 && response.data?.code === 'UNAUTHORIZED', status(response));
  check('every email used the provider key and the sender address', mails.length > 0 && mails.every((item) => item.authorized && item.body.from === FROM), `${mails.length} emails`);
} catch (error) {
  results.push(false);
  console.log(`FAIL harness: ${error.message}`);
} finally {
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await new Promise((resolve) => { server.once('exit', resolve); setTimeout(resolve, 5000); });
  }
  rmSync(work, { recursive: true, force: true });
}

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed} of ${results.length} checks passed`);
process.exitCode = failed ? 1 : 0;
