import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sendAuthEmail } from '../src/server/auth/mail.ts';

// Cloudflare Workers throws on fetch(..., {redirect: 'error'}) before any request leaves. Production verification
// emails therefore never reached the provider (27.11.2026). Server code uses 'manual' and treats any 3xx as a failure.
const serverRoot = fileURLToPath(new URL('../src/server/', import.meta.url));

async function sourceFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(path)));
    else if (/\.tsx?$/.test(entry.name)) files.push(path);
  }
  return files;
}

test('server fetch calls never use redirect "error", which Workers rejects', async () => {
  const offenders: string[] = [];
  for (const path of await sourceFiles(serverRoot)) {
    if (/redirect\s*:\s*['"]error['"]/.test(await readFile(path, 'utf8'))) offenders.push(path.slice(serverRoot.length));
  }
  assert.deepEqual(offenders, []);
});

test('auth email uses manual redirects and logs a failed request without secrets', async (t) => {
  const calls: RequestInit[] = [];
  const logs: string[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    calls.push(init);
    throw new TypeError('network down');
  });
  t.mock.method(console, 'error', (...args: unknown[]) => {
    logs.push(String(args[0]));
  });
  const env = { AUTH_EMAIL_API_URL: 'https://mail.example.test/emails', AUTH_EMAIL_API_KEY: 'test-key', AUTH_EMAIL_FROM: 'Test <no-reply@example.test>' } as never;
  await assert.rejects(sendAuthEmail(env, 'https://example.test', 'user@example.test', 'token', 'verify', 'ru'), /EMAIL_UNAVAILABLE/);
  assert.equal(calls[0]?.redirect, 'manual');
  assert.deepEqual(logs, ['auth-email: request failed TypeError']);
});

test('auth email treats a provider redirect as a failure and logs only its status', async (t) => {
  const logs: string[] = [];
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 302, headers: { Location: 'https://example.test/' } }));
  t.mock.method(console, 'error', (...args: unknown[]) => {
    logs.push(String(args[0]));
  });
  const env = { AUTH_EMAIL_API_URL: 'https://mail.example.test/emails', AUTH_EMAIL_API_KEY: 'test-key', AUTH_EMAIL_FROM: 'Test <no-reply@example.test>' } as never;
  await assert.rejects(sendAuthEmail(env, 'https://example.test', 'user@example.test', 'token', 'verify', 'en'), /EMAIL_UNAVAILABLE/);
  assert.deepEqual(logs, ['auth-email: provider 302']);
});
