/**
 * Project review of one known gap in the pinned Hallmark checker (v2.0.0, rule 48).
 *
 * Hallmark recognises token blocks only on a bare `:root`, `[data-theme]` or in a file named
 * tokens.css. CSS Modules (Next.js, Vite) reject a bare `:root` as impure, so every shipped
 * recipe declares its standalone defaults in a scoped block `:root .<root> { --x-default-y: #... }`.
 * Hallmark reports each such declaration as "colour literal outside tokens".
 *
 * This module does not change, skip or waive the checker. It classifies one exact finding shape
 * and only when the source proves all of the following:
 *  - the file is a `.module.css` file under prototype/src/recipes;
 *  - the reported line lies inside a top-level `:root .<class>` block;
 *  - that block contains custom property declarations only;
 *  - the reported property is declared there with exactly the reported literal;
 *  - the class also has its own top-level rule and the property is consumed via var() outside the block;
 *  - when consumed as `var(--f-<role>, var(<property>))`, the literal equals the approved Saffron value
 *    of that host role (so the downloaded bundle looks like the hosted demo); otherwise it is an
 *    approved palette value.
 * Anything else stays a FAIL.
 */

const GRADES = ['FAIL', 'REFLEX', 'WARN', 'WAIVED', 'WAIVER', 'NOTE', 'ANSWERED', 'DISMISSED', 'REJECTED'];
const FINDING = new RegExp(`^\\s+(${GRADES.join('|')})\\s+(\\S+)\\s+:(\\d+)\\s+(.*?)(?:\\s+\\|\\s+fix:.*)?$`);
const SUMMARY = /^sloplint: (.+?) across (\d+) file\(s\)\.?$/;
const LITERAL_48 = /^colour literal (#[0-9a-fA-F]{3,8}) outside tokens \((--[\w-]+) on (.+)\)$/;

/** Parses the plain-text report; throws when the parsed findings disagree with the checker's own summary. */
export function parseSloplintReport(text) {
  const findings = [];
  let file = null;
  let summary = null;
  for (const line of text.split(/\r?\n/)) {
    const total = SUMMARY.exec(line.trim());
    if (total) {
      const counts = Object.fromEntries(GRADES.map(grade => [grade, 0]));
      for (const part of total[1].split(',')) {
        const match = /^\s*(\d+)\s+([A-Z]+)\s*$/.exec(part);
        if (!match || !(match[2] in counts)) throw new Error(`Unrecognised Hallmark summary: ${line}`);
        counts[match[2]] = Number(match[1]);
      }
      summary = { counts, files: Number(total[2]), line: line.trim() };
      continue;
    }
    const finding = FINDING.exec(line);
    if (finding) {
      if (!file) throw new Error(`Finding without a file header: ${line}`);
      findings.push({ file, grade: finding[1], gate: finding[2], line: Number(finding[3]), evidence: finding[4].trim() });
      continue;
    }
    if (/^\S/.test(line) && /\.(css|scss|tsx?|jsx?|mjs|html?)$/i.test(line.trim())) file = line.trim();
  }
  if (!summary) throw new Error('Hallmark summary line not found');
  for (const grade of GRADES) {
    const parsed = findings.filter(item => item.grade === grade).length;
    if (parsed !== summary.counts[grade]) throw new Error(`Parsed ${parsed} ${grade}, the checker reported ${summary.counts[grade]}`);
  }
  return { findings, summary };
}

const stripComments = css => css.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ' '));
const lineAt = (text, index) => text.slice(0, index).split('\n').length;
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Top-level rules only; nested at-rule bodies are skipped as a whole. */
function topLevelRules(css) {
  const source = stripComments(css);
  const rules = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === '{') {
      if (depth === 0) rules.push({ selector: source.slice(start, index).trim(), open: index });
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth < 0) throw new Error('Unbalanced CSS braces');
      if (depth === 0) {
        const rule = rules.at(-1);
        rule.close = index;
        rule.body = source.slice(rule.open + 1, index);
        rule.startLine = lineAt(source, rule.open);
        rule.endLine = lineAt(source, index);
        start = index + 1;
      }
    } else if (char === ';' && depth === 0) start = index + 1;
  }
  if (depth !== 0) throw new Error('Unbalanced CSS braces');
  return { source, rules };
}

/**
 * @param finding  one parsed finding
 * @param css      the current source of finding.file
 * @param theme    approved Saffron theme: { '--f-role': '#RRGGBB' }
 * @returns {{verified: boolean, reason: string, role?: string|null, value?: string}}
 */
export function classifyTokenFinding(finding, css, theme) {
  const reject = reason => ({ verified: false, reason });
  if (finding.grade !== 'FAIL' || finding.gate !== '48') return reject('not a rule 48 FAIL');
  const literal = LITERAL_48.exec(finding.evidence);
  if (!literal) return reject('not a colour literal finding');
  const [, value, property] = literal;
  if (!/^prototype\/src\/recipes\/[\w-]+\/[\w-]+\.module\.css$/.test(finding.file)) return reject('not a recipe CSS Module');
  let parsed;
  try { parsed = topLevelRules(css); } catch (error) { return reject(error.message); }
  const block = parsed.rules.find(rule => rule.close !== undefined && finding.line >= rule.startLine && finding.line <= rule.endLine);
  if (!block) return reject('line is not inside a top-level rule');
  const scoped = /^:root\s+\.([A-Za-z_][\w-]*)$/.exec(block.selector);
  if (!scoped) return reject(`selector is not a scoped token block: ${block.selector}`);
  const declarations = block.body.split(';').map(part => part.trim()).filter(Boolean);
  const tokens = new Map();
  for (const declaration of declarations) {
    const match = /^(--[\w-]+)\s*:\s*(.+)$/s.exec(declaration);
    if (!match) return reject(`token block contains a non-token declaration: ${declaration.split(':')[0]}`);
    tokens.set(match[1], match[2].trim());
  }
  if (!tokens.has(property)) return reject(`${property} is not declared in the block`);
  if (tokens.get(property).toLowerCase() !== value.toLowerCase()) return reject(`${property} is not exactly ${value}`);
  const owner = parsed.rules.some(rule => rule !== block && rule.selector === `.${scoped[1]}`);
  if (!owner) return reject(`no top-level .${scoped[1]} rule consumes the block`);
  const outside = parsed.source.slice(0, block.open) + parsed.source.slice(block.close + 1);
  const uses = [...outside.matchAll(new RegExp(`var\\(\\s*${escape(property)}\\s*\\)`, 'g'))];
  if (!uses.length) return reject(`${property} is declared but never consumed`);
  const approved = new Set(Object.values(theme).map(color => color.toLowerCase()));
  const roles = [...new Set([...outside.matchAll(new RegExp(`var\\(\\s*(--f-[\\w-]+)\\s*,\\s*var\\(\\s*${escape(property)}\\s*\\)\\s*\\)`, 'g'))].map(match => match[1]))];
  for (const role of roles) {
    if (!(role in theme)) return reject(`${role} is not an approved host role`);
    if (theme[role].toLowerCase() !== value.toLowerCase()) return reject(`${property} ${value} differs from the approved ${role} ${theme[role]}: the bundle would not look like the demo`);
  }
  if (!roles.length && !approved.has(value.toLowerCase())) return reject(`${value} is not an approved palette value`);
  return { verified: true, reason: roles.length ? `default of ${roles.join(', ')}` : 'approved palette value', role: roles[0] ?? null, value };
}
