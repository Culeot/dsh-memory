// Import memory records from a JSONL/JSON file into the DSH memory store,
// merging with existing records (by stable id derived from content hash).
// Usage: node scripts/import-memories.mjs <records.jsonl|records.json>
// Record shape: { title, summary|content, kind, importance, scope, tags[] }
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';

const KINDS = ['fact', 'preference', 'decision', 'lesson', 'todo', 'note'];
const SCOPES = ['user', 'project'];

function stableId(content) {
  return `mem_${createHash('sha256').update(content).digest('hex').slice(0, 16)}`;
}

function normalize(entry) {
  const content = String(entry.content ?? entry.summary ?? '').trim();
  const kind = KINDS.includes(entry.kind) ? entry.kind : 'note';
  const scope = SCOPES.includes(entry.scope) ? entry.scope : 'project';
  const importance = Math.min(3, Math.max(1, Math.round(Number(entry.importance) || 2)));
  const tags = Array.isArray(entry.tags)
    ? [...new Set(entry.tags.map((t) => String(t).trim().toLowerCase().slice(0, 64)).filter(Boolean))].slice(0, 16)
    : [];
  if (!content) return null;
  const now = new Date().toISOString();
  const id = stableId(content);
  return { id, content, kind, tags, scope, project: null, importance, createdAt: now, updatedAt: now, accessedAt: null, accessCount: 0, expiresAt: null };
}

function main() {
  const input = process.argv[2];
  if (!input || !existsSync(input)) {
    console.error('usage: node scripts/import-memories.mjs <records.jsonl|records.json>');
    process.exit(1);
  }
  const raw = readFileSync(input, 'utf8').replace(/^\uFEFF/, '');
  let entries;
  if (raw.trimStart().startsWith('[')) entries = JSON.parse(raw);
  else entries = raw.split(/\r?\n/).filter((l) => l.trim()).map((l) => JSON.parse(l));

  const records = entries.map(normalize).filter(Boolean);
  console.log(`[import] ${records.length} records from ${input}`);

  const dshHome = process.env.DSH_HOME ?? join(homedir(), '.dsh');
  const storePath = join(dshHome, 'storages', 'memory.json');
  if (!existsSync(storePath)) {
    console.error(`[import] store not found: ${storePath} — create it first (run any memory tool once)`);
    process.exit(1);
  }
  const store = JSON.parse(readFileSync(storePath, 'utf8'));
  const table = store.tables.records;
  let added = 0; let merged = 0;
  for (const r of records) {
    if (table[r.id]) { merged += 1; continue; }
    table[r.id] = r; added += 1;
  }
  writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
  console.log(`[import] added ${added}, skipped ${merged} existing → total ${Object.keys(table).length}`);
}

main();
