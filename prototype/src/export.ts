import { zipSync, strToU8 } from 'fflate';
import { buildRecipeFiles, createIntegrationPrompt, type IntegrationOptions } from './recipes/state-relay';

export async function createRecipeArchive(options: IntegrationOptions) {
  const files = buildRecipeFiles(options);
  files.push({ path: 'INTEGRATION_PROMPT.txt', content: createIntegrationPrompt(options) });
  const manifest = files.find(file => file.path === 'manifest.json')!;
  const metadata = JSON.parse(manifest.content);
  metadata.files = [...files.map(file => file.path), 'checksums.json'];
  manifest.content = JSON.stringify(metadata, null, 2) + '\n';
  const entries: Record<string, string> = {};
  for (const file of files) {
    const bytes = new TextEncoder().encode(file.content);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    entries[file.path] = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }
  files.push({ path: 'checksums.json', content: JSON.stringify({ algorithm: 'SHA-256', excludes: ['checksums.json'], files: entries }, null, 2) + '\n' });
  const input = Object.fromEntries(files.map(file => [file.path, strToU8(file.content)]));
  return zipSync(input, { level: 6, mtime: new Date(1980, 0, 1) });
}
