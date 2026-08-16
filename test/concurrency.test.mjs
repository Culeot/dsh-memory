// Concurrency tests: interleaved remember/recall/merge must not lose updates.
// The in-memory fixture mirrors the domain's atomic update semantics (the
// transform fn runs synchronously on the write chain, like KvTable.update).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryCore } from '../lib/index.js';

function makeTable() {
  const map = new Map();
  return {
    map,
    get(k) { return map.get(k); },
    entries() { return map.entries(); },
    async put(k, v) { map.set(k, v); },
    // Atomic read-modify-write: fn runs synchronously against current value.
    async update(k, fn) {
      const current = map.get(k);
      if (current === undefined) throw new Error('missing-key');
      const next = fn(current);
      map.set(k, next);
      return next;
    },
    async delete(k) { return map.delete(k); },
    get size() { return map.size; },
  };
}

const NOW = Date.parse('2026-08-14T00:00:00Z');

const WORDS = ['docker', 'deploy', 'pipeline', 'registry', 'mysql', 'redis', 'npm', 'pnpm', 'vite', 'esbuild', '测试', '部署', '流水线', '镜像', '数据库', '缓存', '配置', '构建', '发布', '回滚', 'concurrent', 'isolation', 'atomic', 'dedup', 'evict', 'merge', 'recall', 'index'];
function randomContent(seed) {
  // Deterministic pseudo-random sentence; unique per seed.
  let state = seed * 2654435761 % 4294967296;
  const pick = () => { state = (state * 1664525 + 1013904223) % 4294967296; return WORDS[state % WORDS.length]; };
  const n = 4 + (seed % 4);
  const parts = [];
  for (let i = 0; i < n; i += 1) parts.push(pick());
  return `${parts.join(' ')} c${seed}`;
}

describe('concurrency', () => {
  it('parallel remember of distinct content stores every record', async () => {
    const core = new MemoryCore(makeTable(), { maxRecords: 500, maxContentChars: 2000, mergeSimilarity: 0.7, recencyHalfLifeDays: 90 });
    const writes = [];
    for (let i = 0; i < 50; i += 1) {
      writes.push(core.remember({ content: randomContent(i + 1), kind: 'note', scope: 'project', now: NOW + i }));
    }
    const results = await Promise.all(writes);
    assert.equal(core['table'].size, 50);
    assert.equal(new Set(results.map((r) => r.id)).size, 50);
  });

  it('interleaved recall touches never lose access counts', async () => {
    const core = new MemoryCore(makeTable(), { maxRecords: 100, maxContentChars: 2000, mergeSimilarity: 0.7, recencyHalfLifeDays: 90 });
    await core.remember({ content: '共享热记忆 docker 部署要点', kind: 'fact', scope: 'project', now: NOW });
    const tasks = [];
    for (let i = 0; i < 25; i += 1) {
      tasks.push(core.recall({ query: 'docker', now: NOW + i }));
    }
    const results = await Promise.all(tasks);
    const hits = results.reduce((n, r) => n + r.results.length, 0);
    const record = [...core['table'].entries()][0][1];
    assert.equal(record.accessCount, hits, `accessCount (${record.accessCount}) must equal total hits (${hits})`);
  });

  it('concurrent merges of the same memory keep one record with combined fields', async () => {
    const core = new MemoryCore(makeTable(), { maxRecords: 100, maxContentChars: 2000, mergeSimilarity: 0.7, recencyHalfLifeDays: 90 });
    const a = await core.remember({ content: '合并目标:git 提交规范遵循 conventional commits', kind: 'decision', tags: ['git'], scope: 'project', now: NOW });
    const variants = [
      { content: '合并目标:git 提交规范遵循 conventional commits 并加类型前缀', tags: ['git', 'commit'], importance: 2 },
      { content: '合并目标:git 提交规范遵循 conventional commits 并加类型前缀和范围', tags: ['git', 'scope'], importance: 3 },
    ];
    const results = await Promise.all(variants.map((v) => core.remember({ ...v, kind: 'decision', scope: 'project', now: NOW + 1 })));
    for (const r of results) assert.equal(r.merged, true);
    assert.equal(core['table'].size, 1, 'variants must merge into the original');
    const final = core['table'].get(a.id);
    assert.ok(final.tags.includes('commit') && final.tags.includes('scope'), 'tags merged');
    assert.equal(final.importance, 3, 'importance takes the max');
    assert.equal(final.accessCount, 2, 'two merges counted');
  });

  it('parallel forget by id and recall do not crash or resurrect records', async () => {
    const core = new MemoryCore(makeTable(), { maxRecords: 100, maxContentChars: 2000, mergeSimilarity: 0.7, recencyHalfLifeDays: 90 });
    const a = await core.remember({ content: '将被删除的临时条目 token 类', kind: 'fact', tags: ['tmp'], scope: 'project', now: NOW });
    await Promise.all([
      core.forget({ id: a.id, now: NOW + 1 }),
      core.recall({ query: 'token', now: NOW + 1 }).catch(() => null),
      core.recall({ query: '', tags: ['tmp'], now: NOW + 1 }).catch(() => null),
    ]);
    assert.equal(core['table'].size, 0);
  });
});
