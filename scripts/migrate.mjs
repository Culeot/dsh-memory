// Migrate a Markdown memory file (the common MEMORY.md style used by
// file-based memory systems) into dsh-agent-memory records.
//
// Parses: `## heading` sections and `- list items`. Heading keywords map to
// memory kinds (偏好/preference, 决策/decision, 教训/lesson, 待办/todo,
// 事实/fact, else note). Emits a JSONL/JSON records file, or applies directly
// to the DSH memory store with --apply.
//
// Usage:
//   node scripts/migrate.mjs <input.md> [-o records.json] [--apply]
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const KIND_HINTS = [
  [/偏好|prefer|喜欢|想要/i, 'preference'],
  [/决策|决定|选型|结论|decision/i, 'decision'],
  [/教训|踩坑|不要|别|lesson|pitfall|never/i, 'lesson'],
  [/待办|todo|TODO|下一步/i, 'todo'],
  [/事实|fact|信息/i, 'fact'],
];
const SCOPE_HINTS = [/\buser\b|全局|跨项目|用户/i, 'user'];

function detectKind(text) {
  for (const [re, kind] of KIND_HINTS) if (re.test(text)) return kind;
  return 'note';
}

function detectScope(text) {
  return SCOPE_HINTS[0].test(text) ? 'user' : 'project';
}

export function parseMarkdownMemory(md) {
  const lines = md.split(/\r?\n/);
  const records = [];
  let currentHeading = '';
  let pendingKind = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('## ')) {
      currentHeading = line.slice(3).trim();
      pendingKind = detectKind(currentHeading);
      continue;
    }
    if (line.startsWith('# ')) continue; // title
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const content = line.slice(2).trim();
      if (content === '') continue;
      const kind = detectKind(content);
      const headingTag = currentHeading.toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, '-').slice(0, 32);
      records.push({
        content: currentHeading ? `${currentHeading}: ${content}` : content,
        kind: kind === 'note' && pendingKind ? pendingKind : kind,
        tags: headingTag ? [headingTag] : [],
        scope: detectScope(currentHeading + ' ' + content),
        importance: kind === 'lesson' ? 2 : 1,
      });
    }
  }
  return records;
}

function toRecord(input, baseTime) {
  const id = `mem_${randomUUID().replaceAll('-', '').slice(0, 16)}`;
  const iso = new Date(baseTime).toISOString();
  return {
    id, ...input, project: null,
    createdAt: iso, updatedAt: iso, accessedAt: null, accessCount: 0, expiresAt: null,
  };
}

function main() {
  const args = process.argv.slice(2);
  const input = args.find((a) => !a.startsWith('-'));
  if (!input || !existsSync(input)) {
    console.error('usage: node scripts/migrate.mjs <input.md> [-o records.json] [--apply]');
    process.exit(1);
  }
  const outIdx = args.indexOf('-o');
  const outFile = outIdx >= 0 ? args[outIdx + 1] : null;
  const apply = args.includes('--apply');

  const md = readFileSync(input, 'utf8');
  const parsed = parseMarkdownMemory(md);
  const baseTime = Date.now();
  const records = parsed.map((r, i) => toRecord(r, baseTime + i * 1000));

  console.log(`[migrate] parsed ${records.length} memories from ${input}`);

  if (apply) {
    const dshHome = process.env.DSH_HOME ?? join(process.env.USERPROFILE ?? '', '.dsh');
    const storePath = join(dshHome, 'storages', 'memory.json');
    if (!existsSync(storePath)) {
      console.error(`[migrate] store not found: ${storePath} — run --apply from a machine that has used dsh-agent-memory once`);
      process.exit(1);
    }
    const store = JSON.parse(readFileSync(storePath, 'utf8'));
    const table = store.tables?.records ?? (store.tables.records = {});
    let added = 0;
    for (const r of records) {
      if (!table[r.id]) { table[r.id] = r; added += 1; }
    }
    writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
    console.log(`[migrate] applied: ${added} records merged into ${storePath}`);
  } else if (outFile) {
    writeFileSync(outFile, JSON.stringify(records, null, 2), 'utf8');
    console.log(`[migrate] wrote ${records.length} records to ${outFile}`);
  } else {
    console.log(JSON.stringify(records, null, 2));
  }
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main();

// ---- self test ----
export function selfTest() {
  const md = [
    '# Memory',
    '## 用户偏好',
    '- 喜欢深色主题',
    '- 偏好网盘→链接→自动发货的上架方式',
    '## 决策',
    '- 数学教辅用单色排版',
    '## 踩坑教训',
    '- markdown 分隔线会吞 answerline',
    '## 事实',
    '- 用户在意大利',
  ].join('\n');
  const records = parseMarkdownMemory(md);
  if (records.length !== 5) throw new Error(`expected 5, got ${records.length}`);
  if (records[0].kind !== 'preference') throw new Error('heading kind mapping failed');
  if (records[4].scope !== 'user') throw new Error('scope hint failed');
  return records;
}
