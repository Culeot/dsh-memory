// Unit tests for dsh-agent-memory core logic. Run against the built lib bundle:
//   npm run build && npm test
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MemoryCore,
  Config,
} from '../lib/index.js';
import { MemoryRecordSchema, MEMORY_DEFAULTS } from '../lib/index.js';
import { tokenize, tokenSet, jaccard, scoreRecord, hotRecords, isExpired, hasMeaningfulQuery, explainRecord, bm25Signal, rankRecords } from '../lib/index.js';
import { queryFromMessages, renderInjection, extractErrorFingerprint } from '../lib/index.js';

// ---- weak-match cutoff & query quality ---------------------------------------

describe('weak-match cutoff (anti unrelated-association)', () => {
  const base = {
    id: 'mem_1', kind: 'note', tags: [], scope: 'project', project: null,
    importance: 2, createdAt: '2026-08-10T00:00:00Z', updatedAt: '2026-08-13T00:00:00Z',
    accessedAt: null, accessCount: 0, expiresAt: null,
  };

  it('short filler query scores 0 against unrelated memories', () => {
    const unrelated = scoreRecord({ ...base, content: '163邮箱IMAP配置详情' }, 'ok了吗', { now: FIXED_NOW });
    assert.equal(unrelated, 0);
  });

  it('pure single-char coincidence no longer produces a hit', () => {
    // "果" overlaps, but that alone is below MATCH_BASE_MIN.
    const weak = scoreRecord({ ...base, content: '水果摊今日进货' }, '苹果', { now: FIXED_NOW });
    assert.equal(weak, 0);
    // Real substring hit still works.
    const strong = scoreRecord({ ...base, content: '苹果公司发布新手机' }, '苹果', { now: FIXED_NOW });
    assert.ok(strong > 1);
  });

  it('tag and bigram matches survive the cutoff', () => {
    const tagHit = scoreRecord({ ...base, content: '无关内容', tags: ['deploy'] }, 'deploy', { now: FIXED_NOW });
    assert.ok(tagHit > 1);
    const bigramHit = scoreRecord({ ...base, content: '部署流程docker构建' }, '部署 docker', { now: FIXED_NOW });
    assert.ok(bigramHit > 1);
  });
});

describe('hasMeaningfulQuery', () => {
  it('rejects filler/short queries', () => {
    assert.equal(hasMeaningfulQuery('ok了吗'), false);
    assert.equal(hasMeaningfulQuery('可以吗'), false);
    assert.equal(hasMeaningfulQuery('嗯'), false);
  });
  it('accepts informative queries', () => {
    assert.equal(hasMeaningfulQuery('继续搞教辅'), true);
    assert.equal(hasMeaningfulQuery('部署 docker'), true);
    assert.equal(hasMeaningfulQuery('闲鱼'), true);
  });
});

// ---- lesson auto-solidification fingerprint ------------------------------------

describe('extractErrorFingerprint', () => {
  it('prefers typed code over message', () => {
    assert.equal(extractErrorFingerprint({ code: 'MEMORY_EXTERNAL_MODIFIED', message: 'file changed' }), 'MEMORY_EXTERNAL_MODIFIED');
  });
  it('falls back to message for plain errors', () => {
    assert.equal(extractErrorFingerprint(new Error('disk full')), 'disk full');
    assert.equal(extractErrorFingerprint('boom'), 'boom');
  });
  it('same mistake maps to same fingerprint, different mistakes differ', () => {
    assert.equal(extractErrorFingerprint({ code: 'E1' }), extractErrorFingerprint({ code: 'E1' }));
    assert.notEqual(extractErrorFingerprint({ code: 'E1' }), extractErrorFingerprint({ code: 'E2' }));
  });
});

// ---- pre-step dynamic injection -------------------------------------------------

describe('pre-step injection helpers', () => {
  it('queryFromMessages extracts text from data.content blocks', () => {
    const msgs = [
      { data: { content: [{ type: 'text', text: '继续搞小学数学教辅' }] } },
      { data: { content: '帮我看闲鱼' } },
    ];
    const q = queryFromMessages(msgs);
    assert.ok(q.includes('教辅'));
    assert.ok(q.includes('闲鱼'));
  });

  it('queryFromMessages tolerates empty input', () => {
    assert.equal(queryFromMessages([]), '');
    assert.equal(queryFromMessages(undefined), '');
  });

  it('renderInjection produces compact blocks with flags', () => {
    const results = [
      { id: 'mem_1', content: '排版用单色' + '很长'.repeat(50), kind: 'decision', tags: [], scope: 'project', importance: 2, updatedAt: 'x', score: 1 },
      { id: 'mem_2', content: '用户偏好深色', kind: 'preference', tags: [], scope: 'user', importance: 3, updatedAt: 'x', score: 1 },
    ];
    const text = renderInjection(results, 30);
    assert.ok(text.includes('相关记忆'));
    assert.ok(text.includes('重要'));
    assert.ok(text.includes('全局'));
    assert.ok(Array.from(text).length < 200, 'injection stays compact');
    assert.equal(renderInjection([], 30), '');
  });
});

// ---- in-memory table fixture ------------------------------------------------

function makeTable() {
  const map = new Map();
  return {
    map,
    get(key) { return map.get(key); },
    entries() { return map.entries(); },
    async put(key, value) { map.set(key, value); },
    async update(key, fn) {
      if (!map.has(key)) throw new Error('missing-key');
      const next = fn(map.get(key));
      map.set(key, next);
      return next;
    },
    async delete(key) { return map.delete(key); },
    get size() { return map.size; },
  };
}

function makeCore(configOverrides = {}) {
  const config = {
    maxRecords: MEMORY_DEFAULTS.maxRecords,
    maxContentChars: MEMORY_DEFAULTS.maxContentChars,
    mergeSimilarity: MEMORY_DEFAULTS.mergeSimilarity,
    recencyHalfLifeDays: MEMORY_DEFAULTS.recencyHalfLifeDays,
    ...configOverrides,
  };
  return new MemoryCore(makeTable(), config);
}

const FIXED_NOW = Date.parse('2026-08-14T00:00:00Z');

// ---- search ----------------------------------------------------------------

describe('tokenize', () => {
  it('splits ascii words and individual CJK chars', () => {
    const tokens = tokenize('Deploy 脚本 error');
    assert.ok(tokens.includes('deploy'));
    assert.ok(tokens.includes('error'));
    assert.ok(tokens.includes('脚'));
    assert.ok(tokens.includes('本'));
  });
});

describe('jaccard', () => {
  it('is 1 for identical sets, 0 for disjoint', () => {
    assert.equal(jaccard(tokenSet('a b c'), tokenSet('a b c')), 1);
    assert.equal(jaccard(tokenSet('a'), tokenSet('x')), 0);
  });
});

describe('scoreRecord', () => {
  const base = {
    id: 'mem_1', kind: 'note', tags: [], scope: 'project', project: null,
    importance: 2, createdAt: '2026-08-10T00:00:00Z', updatedAt: '2026-08-13T00:00:00Z',
    accessedAt: null, accessCount: 0, expiresAt: null, content: 'deployment pipeline uses docker',
  };

  it('substring hit scores far above unrelated content', () => {
    const hit = scoreRecord(base, 'deployment', { now: FIXED_NOW });
    const miss = scoreRecord({ ...base, content: 'user likes tea' }, 'deployment', { now: FIXED_NOW });
    assert.ok(hit > 0);
    assert.equal(miss, 0);
  });

  it('higher importance scores higher', () => {
    const low = scoreRecord({ ...base, importance: 1 }, 'deployment', { now: FIXED_NOW });
    const high = scoreRecord({ ...base, importance: 3 }, 'deployment', { now: FIXED_NOW });
    assert.ok(high > low);
  });

  it('fresher records score higher', () => {
    const old = scoreRecord({ ...base, updatedAt: '2026-01-01T00:00:00Z' }, 'deployment', { now: FIXED_NOW });
    const fresh = scoreRecord({ ...base, updatedAt: '2026-08-14T00:00:00Z' }, 'deployment', { now: FIXED_NOW });
    assert.ok(fresh > old);
  });
});

describe('scoreRecord (bigram precision)', () => {
  const base = {
    id: 'mem_1', kind: 'note', tags: [], scope: 'project', project: null,
    importance: 2, createdAt: '2026-08-10T00:00:00Z', updatedAt: '2026-08-13T00:00:00Z',
    accessedAt: null, accessCount: 0, expiresAt: null, content: '苹果公司发布新手机',
  };

  it('bigram match beats single-char coincidence by a wide margin', () => {
    const apple = scoreRecord(base, '苹果', { now: FIXED_NOW });
    const fruit = scoreRecord({ ...base, content: '水果摊今天进了一批苹果' }, '苹果', { now: FIXED_NOW });
    const unrelated = scoreRecord({ ...base, content: '用户喜欢喝茶' }, '苹果', { now: FIXED_NOW });
    assert.ok(apple > 0);
    assert.ok(unrelated === 0);
    assert.ok(apple > fruit, `exact bigram (${apple}) should beat partial match (${fruit})`);
  });

  it('tag hits contribute', () => {
    const withTag = scoreRecord({ ...base, tags: ['deploy'] }, 'deploy', { now: FIXED_NOW });
    assert.ok(withTag > 0);
  });
});

describe('isExpired / TTL', () => {
  it('expired records are detected; null never expires', () => {
    assert.equal(isExpired({ expiresAt: '2026-08-01T00:00:00Z' }, FIXED_NOW), true);
    assert.equal(isExpired({ expiresAt: null }, FIXED_NOW), false);
    assert.equal(isExpired({ expiresAt: '2026-09-01T00:00:00Z' }, FIXED_NOW), false);
  });
});

describe('hotRecords', () => {
  const mk = (overrides) => ({
    id: 'mem_1', kind: 'note', tags: [], scope: 'project', project: null, content: 'x',
    importance: 2, createdAt: '2026-08-10T00:00:00Z', updatedAt: '2026-08-13T00:00:00Z',
    accessedAt: null, accessCount: 0, expiresAt: null, ...overrides,
  });
  it('ranks accessed + important + fresh records first, excludes expired', () => {
    const hot = mk({ id: 'mem_hot', importance: 3, accessCount: 10, updatedAt: '2026-08-14T00:00:00Z' });
    const cold = mk({ id: 'mem_cold', importance: 1, accessCount: 0, updatedAt: '2026-01-01T00:00:00Z' });
    const dead = mk({ id: 'mem_dead', expiresAt: '2026-08-01T00:00:00Z' });
    const ranked = hotRecords([cold, hot, dead], 10, { now: FIXED_NOW });
    assert.deepEqual(ranked.map((r) => r.record.id), ['mem_hot', 'mem_cold']);
  });
});

// ---- MemoryCore ------------------------------------------------------------

describe('MemoryCore.remember', () => {
  it('stores a record with normalized fields', async () => {
    const core = makeCore();
    const out = await core.remember({ content: '  用户喜欢深色主题  ', kind: 'preference', tags: ['theme', ' THEME '], scope: 'user', importance: 3, now: FIXED_NOW });
    assert.equal(out.merged, false);
    const rec = core['table'].get(out.id);
    assert.equal(rec.content, '用户喜欢深色主题');
    assert.deepEqual(rec.tags, ['theme']);
    assert.equal(rec.importance, 3);
    assert.equal(rec.scope, 'user');
    assert.equal(rec.project, null);
  });

  it('merges near-duplicates instead of duplicating', async () => {
    const core = makeCore();
    const a = await core.remember({ content: '部署流程:docker build 然后 push 到 registry', kind: 'decision', scope: 'project', project: '/p', now: FIXED_NOW });
    const b = await core.remember({ content: '部署流程:docker build 然后 push 到 registry 并重启', kind: 'decision', scope: 'project', project: '/p', now: FIXED_NOW });
    assert.equal(b.merged, true);
    assert.equal(b.id, a.id);
    assert.equal(core['table'].size, 1);
    const rec = core['table'].get(a.id);
    assert.equal(rec.accessCount, 1);
  });

  it('evicts low-importance oldest records over capacity, keeps importance 3', async () => {
    const core = makeCore({ maxRecords: 3 });
    for (let i = 0; i < 3; i += 1) {
      await core.remember({ content: `filler ${i}`, kind: 'note', scope: 'project', importance: 1, now: FIXED_NOW - (100 - i) });
    }
    const keep = await core.remember({ content: '关键生产密码轮换策略', kind: 'decision', scope: 'project', importance: 3, now: FIXED_NOW });
    assert.equal(core['table'].size, 3);
    assert.ok(core['table'].get(keep.id));
    const importants = [...core['table'].entries()].filter(([, r]) => r.importance === 3);
    assert.equal(importants.length, 1);
  });

  it('when only importance-3 records remain over capacity, evicts the oldest one (no deadlock)', async () => {
    const core = makeCore({ maxRecords: 2 });
    const a = await core.remember({ content: '关键规则甲', kind: 'decision', scope: 'project', importance: 3, now: FIXED_NOW - 1000 });
    await core.remember({ content: '关键规则乙', kind: 'decision', scope: 'project', importance: 3, now: FIXED_NOW });
    const c = await core.remember({ content: '关键规则丙', kind: 'decision', scope: 'project', importance: 3, now: FIXED_NOW + 1000 });
    assert.equal(core['table'].size, 2);
    assert.ok(core['table'].get(c.id));
    assert.equal(core['table'].get(a.id), undefined); // oldest critical evicted
  });

  it('rejects empty content', async () => {
    const core = makeCore();
    await assert.rejects(() => core.remember({ content: '   ', kind: 'note', scope: 'project', now: FIXED_NOW }));
  });

  it('applies TTL and clamps absurd values', async () => {
    const core = makeCore();
    const out = await core.remember({ content: '临时 token abc123', kind: 'fact', scope: 'project', ttlDays: 1, now: FIXED_NOW });
    const rec = core['table'].get(out.id);
    assert.ok(rec.expiresAt);
    assert.equal(isExpired(rec, FIXED_NOW + 2 * 24 * 3600 * 1000), true);
    // 1e9 days clamps to 3650 days instead of overflowing the Date range.
    const big = await core.remember({ content: '超长 ttl', kind: 'fact', scope: 'project', ttlDays: 1e9, now: FIXED_NOW });
    const bigRec = core['table'].get(big.id);
    assert.equal(isExpired(bigRec, FIXED_NOW + 4000 * 24 * 3600 * 1000), true);
    assert.equal(isExpired(bigRec, FIXED_NOW + 3000 * 24 * 3600 * 1000), false);
  });

  it('merge without explicit ttl keeps the existing expiry; explicit ttl refreshes it', async () => {
    const core = makeCore();
    const a = await core.remember({ content: '带 ttl 的决策:用 docker 部署并固定版本号', kind: 'decision', scope: 'project', ttlDays: 30, now: FIXED_NOW });
    const aRec = core['table'].get(a.id);
    // Re-remember without ttl → expiry preserved.
    await core.remember({ content: '带 ttl 的决策:用 docker 部署并固定版本号再加监控', kind: 'decision', scope: 'project', now: FIXED_NOW + 1000 });
    assert.equal(core['table'].get(a.id).expiresAt, aRec.expiresAt);
    // Re-remember with explicit ttl → expiry refreshed.
    await core.remember({ content: '带 ttl 的决策:用 docker 部署并固定版本号再加监控和告警', kind: 'decision', scope: 'project', ttlDays: 90, now: FIXED_NOW + 2000 });
    const merged = core['table'].get(a.id);
    assert.notEqual(merged.expiresAt, aRec.expiresAt);
    assert.equal(isExpired(merged, FIXED_NOW + 60 * 24 * 3600 * 1000), false);
  });
});

describe('MemoryCore.recall', () => {
  it('ranks by relevance and filters by kind/tag/scope', async () => {
    const core = makeCore();
    await core.remember({ content: 'docker 部署流水线', kind: 'decision', tags: ['deploy'], scope: 'project', project: '/p', now: FIXED_NOW });
    await core.remember({ content: '用户喜欢喝茶', kind: 'preference', tags: ['tea'], scope: 'user', now: FIXED_NOW });
    await core.remember({ content: '无关内容 天气很好', kind: 'note', scope: 'project', now: FIXED_NOW });

    const byQuery = await core.recall({ query: '部署', now: FIXED_NOW });
    assert.equal(byQuery.totalMatched, 1);
    assert.equal(byQuery.results[0].kind, 'decision');

    const byTag = await core.recall({ query: '', tags: ['tea'], now: FIXED_NOW });
    assert.equal(byTag.totalMatched, 1);

    const byScope = await core.recall({ query: '', scope: 'user', now: FIXED_NOW });
    assert.equal(byScope.totalMatched, 1);
  });

  it('reports totalMatched beyond the returned limit', async () => {
    const core = makeCore();
    for (let i = 0; i < 8; i += 1) {
      await core.remember({ content: `部署流水线变体 ${i} 号 alpha${i}`, kind: 'note', scope: 'project', now: FIXED_NOW + i });
    }
    const res = await core.recall({ query: '部署', limit: 3, now: FIXED_NOW + 100 });
    assert.equal(res.totalMatched, 8);
    assert.equal(res.returned, 3);
    assert.equal(res.results.length, 3);
  });

  it('recalling a record makes it hotter (freshness driven by last activity)', async () => {
    const core = makeCore();
    const old = await core.remember({ content: '很久以前的重要决定 docker 部署', kind: 'decision', scope: 'project', importance: 2, now: FIXED_NOW - 200 * 24 * 3600 * 1000 });
    await core.remember({ content: '别的记忆 无关 docker', kind: 'note', scope: 'project', now: FIXED_NOW });
    // Old record recalled recently → its last activity (accessedAt) is fresh,
    // so it outranks the unrelated newer record on the hot path (empty query).
    await core.recall({ query: 'docker', now: FIXED_NOW });
    const refreshed = core['table'].get(old.id);
    assert.ok(refreshed.accessedAt !== null, 'recall touched the record');
    const hot = hotRecords(core['table'].entries() ? [...core['table'].entries()].map(([, v]) => v) : [], 5, { now: FIXED_NOW });
    const ranked = hot.map(({ record }) => record.id);
    const oldRank = ranked.indexOf(old.id);
    const other = [...core['table'].entries()].find(([, v]) => v.id !== old.id);
    assert.ok(oldRank >= 0, 'recalled record enters the hot set');
    if (other) {
      assert.ok(oldRank <= ranked.indexOf(other[1].id), 'recalled old record ranks above the unrecalled newer one');
    }
  });

  it('increments access counters for winners', async () => {
    const core = makeCore();
    const out = await core.remember({ content: '踩坑:markdown 分隔线吞 answerline', kind: 'lesson', tags: ['markdown'], scope: 'project', now: FIXED_NOW });
    await core.recall({ query: 'markdown', now: FIXED_NOW });
    const rec = core['table'].get(out.id);
    assert.equal(rec.accessCount, 1);
    assert.ok(rec.accessedAt);
  });

  it('purges expired records on recall', async () => {
    const core = makeCore();
    await core.remember({ content: '会过期的事实', kind: 'fact', scope: 'project', ttlDays: 1, now: FIXED_NOW });
    const res = await core.recall({ query: '', now: FIXED_NOW + 3 * 24 * 3600 * 1000 });
    assert.equal(res.totalMatched, 0);
    assert.equal(core['table'].size, 0);
  });

  it('truncates result content to contentMax (cheaper calls)', async () => {
    const core = makeCore();
    const long = '部署流水线细节 ' + '内容'.repeat(300);
    await core.remember({ content: long, kind: 'decision', scope: 'project', now: FIXED_NOW });
    const res = await core.recall({ query: '部署', contentMax: 100, now: FIXED_NOW });
    assert.equal(res.results.length, 1);
    assert.ok(res.results[0].content.length <= 101, `content truncated to ~100, got ${res.results[0].content.length}`);
    assert.ok(res.results[0].content.endsWith('…'));
    // Default contentMax (400) also truncates the 600+ char record.
    const def = await core.recall({ query: '部署', now: FIXED_NOW });
    assert.ok(def.results[0].content.length <= 401, `default truncation to 400, got ${def.results[0].content.length}`);
  });
});

describe('MemoryCore.index', () => {
  it('returns truncated newest-first entries with stats', async () => {
    const core = makeCore();
    await core.remember({ content: 'a'.repeat(300), kind: 'fact', scope: 'project', now: FIXED_NOW });
    await core.remember({ content: 'second', kind: 'note', scope: 'project', now: FIXED_NOW + 1000 });
    const idx = await core.index({ now: FIXED_NOW + 2000 });
    assert.equal(idx.total, 2);
    assert.equal(idx.entries[0].content, 'second');
    assert.equal(idx.entries[1].content.length, 121); // 120 + ellipsis
    assert.equal(idx.byKind.fact, 1);
    assert.equal(idx.byKind.note, 1);
  });

  it('truncates by code points, never splitting surrogate pairs (emoji)', async () => {
    const core = makeCore();
    const emoji = '🍎'.repeat(150);
    await core.remember({ content: emoji, kind: 'fact', scope: 'project', now: FIXED_NOW });
    const idx = await core.index({ now: FIXED_NOW });
    const shown = idx.entries[0].content;
    const chars = Array.from(shown);
    assert.equal(chars.length, 121); // code points, not UTF-16 units
    const hasDanglingSurrogate = chars.some((ch) => {
      const code = ch.codePointAt(0);
      return code >= 0xd800 && code <= 0xdfff; // lone surrogate would be split
    });
    assert.equal(hasDanglingSurrogate, false, 'no dangling surrogate at the cut');
  });
});

describe('MemoryCore.forget', () => {
  it('deletes by id, refuses importance-3 without confirm', async () => {
    const core = makeCore();
    const a = await core.remember({ content: '小事', kind: 'note', scope: 'project', importance: 1, now: FIXED_NOW });
    const b = await core.remember({ content: '关键规则', kind: 'decision', scope: 'project', importance: 3, now: FIXED_NOW });

    await assert.rejects(() => core.forget({ id: b.id, now: FIXED_NOW }));
    const ok = await core.forget({ id: b.id, confirm: true, now: FIXED_NOW });
    assert.equal(ok.deleted, 1);
    const gone = await core.forget({ id: a.id, now: FIXED_NOW });
    assert.equal(gone.deleted, 1);
    assert.equal(core['table'].size, 0);
  });

  it('deletes by tags, skipping importance-3 without confirm, reporting skips', async () => {
    const core = makeCore();
    await core.remember({ content: 'tag 目标 1', kind: 'note', tags: ['tmp'], scope: 'project', importance: 1, now: FIXED_NOW });
    await core.remember({ content: 'tag 目标 2', kind: 'note', tags: ['tmp'], scope: 'project', importance: 2, now: FIXED_NOW });
    await core.remember({ content: 'tag 目标 3 关键', kind: 'decision', tags: ['tmp'], scope: 'project', importance: 3, now: FIXED_NOW });
    await core.remember({ content: '别的', kind: 'note', tags: ['keep'], scope: 'project', now: FIXED_NOW });

    const out = await core.forget({ tags: ['tmp'], now: FIXED_NOW });
    assert.equal(out.deleted, 2); // importance 3 skipped
    assert.equal(out.skippedImportant, 1);
    assert.equal(core['table'].size, 2);
  });

  it('requires an id or tags', async () => {
    const core = makeCore();
    await assert.rejects(() => core.forget({ now: FIXED_NOW }));
  });
});

describe('MemoryCore.updateContent', () => {
  it('overwrites content/tags/importance and bumps updatedAt', async () => {
    const core = makeCore();
    const out = await core.remember({ content: '旧内容 docker 部署', kind: 'decision', tags: ['old'], scope: 'project', importance: 1, now: FIXED_NOW });
    const before = core['table'].get(out.id);
    const res = await core.updateContent({ id: out.id, content: '新内容 改好了', tags: ['new', '编辑'], importance: 3, now: FIXED_NOW + 1000 });
    assert.equal(res.updated, true);
    const rec = core['table'].get(out.id);
    assert.equal(rec.content, '新内容 改好了');
    assert.deepEqual(rec.tags, ['new', '编辑']);
    assert.equal(rec.importance, 3);
    assert.notEqual(rec.updatedAt, before.updatedAt);
  });

  it('returns updated:false for a missing id; rejects empty content', async () => {
    const core = makeCore();
    assert.deepEqual(await core.updateContent({ id: 'mem_none', content: 'x', now: FIXED_NOW }), { id: 'mem_none', updated: false });
    const out = await core.remember({ content: '会清空的记忆', kind: 'note', scope: 'project', now: FIXED_NOW });
    await assert.rejects(() => core.updateContent({ id: out.id, content: '   ', now: FIXED_NOW }));
  });
});

// ---- external-modification guard -------------------------------------------------

describe('MemoryCore external-modification guard', () => {
  it('calls beforeWrite on every mutating operation', async () => {
    let calls = 0;
    const core = new MemoryCore(makeTable(), { maxRecords: 100, maxContentChars: 2000, mergeSimilarity: 0.7, recencyHalfLifeDays: 90 }, () => { calls += 1; });
    await core.remember({ content: '写一条', kind: 'note', scope: 'project', now: FIXED_NOW });
    await core.recall({ query: '', now: FIXED_NOW });
    await core.remember({ content: '再写一条', kind: 'note', scope: 'project', now: FIXED_NOW });
    await core.forget({ id: 'none', now: FIXED_NOW });
    assert.ok(calls >= 3, `guard called ${calls} times`);
  });

  it('refuses writes when beforeWrite throws (external modification)', async () => {
    const core = new MemoryCore(makeTable(), { maxRecords: 100, maxContentChars: 2000, mergeSimilarity: 0.7, recencyHalfLifeDays: 90 }, () => {
      throw new Error('MEMORY_EXTERNAL_MODIFIED');
    });
    await assert.rejects(() => core.remember({ content: 'x', kind: 'note', scope: 'project', now: FIXED_NOW }), /MEMORY_EXTERNAL_MODIFIED/);
    await assert.rejects(() => core.recall({ query: 'x', now: FIXED_NOW }), /MEMORY_EXTERNAL_MODIFIED/);
  });

  it('read-only index is not blocked by the guard', async () => {
    const core = new MemoryCore(makeTable(), { maxRecords: 100, maxContentChars: 2000, mergeSimilarity: 0.7, recencyHalfLifeDays: 90 }, () => { throw new Error('guard'); });
    await core.index({ now: FIXED_NOW }); // must not throw
  });
});

// ---- spec ------------------------------------------------------------------

describe('MemoryRecordSchema', () => {
  it('rejects records with invalid kind or importance', () => {
    const good = {
      id: 'mem_x', content: 'ok', kind: 'fact', tags: [], scope: 'project', project: null,
      importance: 2, createdAt: '2026-08-14T00:00:00Z', updatedAt: '2026-08-14T00:00:00Z',
      accessedAt: null, accessCount: 0, expiresAt: null,
    };
    assert.ok(MemoryRecordSchema.parse(good));
    assert.throws(() => MemoryRecordSchema.parse({ ...good, kind: 'bogus' }));
    assert.throws(() => MemoryRecordSchema.parse({ ...good, importance: 9 }));
    assert.throws(() => MemoryRecordSchema.parse({ ...good, scope: 'global' }));
  });
});

// ---- explainRecord / bm25Signal (P0: explainable recall) -------------------

describe('explainRecord / bm25Signal', () => {
  const mk = (overrides) => ({
    id: 'mem_1', kind: 'note', tags: [], scope: 'project', project: null, content: 'x',
    importance: 2, createdAt: '2026-08-10T00:00:00Z', updatedAt: '2026-08-13T00:00:00Z',
    accessedAt: null, accessCount: 0, expiresAt: null, ...overrides,
  });

  it('explainRecord explains why a record hit', () => {
    const rec = mk({ content: '部署流程 docker 构建', tags: ['deploy'], importance: 3, updatedAt: '2026-08-14T00:00:00Z' });
    const { score, reasons } = explainRecord(rec, '部署 docker', { now: FIXED_NOW });
    assert.ok(score > 0);
    assert.ok(reasons.some((r) => r.startsWith('substring') || r.startsWith('qword') || r.startsWith('bigram')), `reasons: ${reasons.join(' | ')}`);
    assert.ok(reasons.some((r) => r.startsWith('importance:3')), `importance reason missing: ${reasons.join(' | ')}`);
    assert.ok(reasons[0].startsWith('base:'), 'base summary should come first');
    assert.ok(reasons.length <= 8);
  });

  it('no-match produces zero score', () => {
    const rec = mk({ content: '用户喜欢喝茶' });
    const { score } = explainRecord(rec, '苹果', { now: FIXED_NOW });
    assert.equal(score, 0);
  });

  it('bm25 rewards repeated query tokens and stays capped', () => {
    const short = bm25Signal('部署部署', '部署部署部署');
    assert.ok(short > 0);
    assert.ok(short <= 2.0, `capped at 2.0, got ${short}`);
    assert.equal(bm25Signal('苹果', '部署 docker'), 0);
  });

  it('rankRecords attaches reasons to winners, drops no-match', () => {
    const recs = [
      mk({ id: 'mem_a', content: '部署流水线 docker 构建', updatedAt: '2026-08-14T00:00:00Z' }),
      mk({ id: 'mem_b', content: '用户喜欢喝茶', updatedAt: '2026-08-14T00:00:00Z' }),
    ];
    const ranked = rankRecords(recs, '部署', 5, { now: FIXED_NOW });
    assert.equal(ranked[0].record.id, 'mem_a');
    assert.ok(Array.isArray(ranked[0].reasons) && ranked[0].reasons.length > 0);
    assert.equal(ranked.find((r) => r.record.id === 'mem_b'), undefined);
  });
});
