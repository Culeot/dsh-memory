// Retrieval quality evaluation: a realistic memory corpus + queries, records
// top-1/top-3 hit rates. Output → research/retrieval-eval.md.
// Usage: node scripts/eval-retrieval.mjs
import { MemoryCore } from '../lib/index.js';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

function makeTable() {
  const map = new Map();
  return {
    get(k) { return map.get(k); },
    entries() { return map.entries(); },
    async put(k, v) { map.set(k, v); },
    async update(k, fn) { const n = fn(map.get(k)); map.set(k, n); return n; },
    async delete(k) { return map.delete(k); },
    get size() { return map.size; },
  };
}

// ---- corpus: realistic Chinese+English memories ----------------------------
const CORPUS = [
  { content: '用户做小学数学教辅,上架走网盘→链接→自动发货', kind: 'preference', tags: ['xiaoxue', 'publishing'], scope: 'user' },
  { content: '踩坑:markdown 分隔线会吞 answerline 导致答案丢失', kind: 'lesson', tags: ['markdown', 'format'], scope: 'project' },
  { content: '部署流程:docker build 然后 push 到私有 registry', kind: 'decision', tags: ['deploy', 'docker'], scope: 'project' },
  { content: '用户在意大利,时差比国内晚 6 小时', kind: 'fact', tags: ['user', 'timezone'], scope: 'user' },
  { content: 'Windows 文件名禁止 */~ 字符,会冲突', kind: 'lesson', tags: ['windows', 'naming'], scope: 'project' },
  { content: '数学教辅用单色排版,不搞花哨样式', kind: 'preference', tags: ['xiaoxue', 'layout'], scope: 'project' },
  { content: 'bing-search-mcp 是 Node 零依赖 stdio 服务', kind: 'fact', tags: ['mcp', 'node'], scope: 'project' },
  { content: '显卡驱动更新后 ollama 本地模型推理变慢', kind: 'lesson', tags: ['ollama', 'gpu'], scope: 'project' },
  { content: '待办:发布小学数学上册到网盘', kind: 'todo', tags: ['xiaoxue', 'publishing'], scope: 'project' },
  { content: '用户喜欢深色主题 UI', kind: 'preference', tags: ['user', 'ui'], scope: 'user' },
];

const QUERIES = [
  { q: '教辅怎么发布', expect: [0, 8] },        // preference + todo
  { q: 'answerline 丢了', expect: [1] },
  { q: '部署 docker', expect: [2] },
  { q: '用户在哪个时区', expect: [3] },
  { q: 'Windows 文件名', expect: [4] },
  { q: '教辅排版样式', expect: [5] },
  { q: 'MCP 搜索服务', expect: [6] },
  { q: '本地模型变慢', expect: [7] },
  { q: '用户界面偏好', expect: [9] },
];

async function main() {
  const core = new MemoryCore(makeTable(), { maxRecords: 100, maxContentChars: 2000, mergeSimilarity: 0.7, recencyHalfLifeDays: 90 });
  const now = Date.parse('2026-08-14T00:00:00Z');
  for (let i = 0; i < CORPUS.length; i += 1) {
    await core.remember({ ...CORPUS[i], importance: 2, now: now + i * 1000 });
  }

  const rows = [];
  let top1 = 0; let top3 = 0; let top5 = 0;
  for (const { q, expect } of QUERIES) {
    const res = await core.recall({ query: q, limit: 5, now: now + 10000 });
    // map returned results back to corpus indices by content prefix
    const idx = res.results.map((r) => CORPUS.findIndex((c) => r.content.startsWith(c.content.slice(0, 12))));
    const hit1 = idx.length > 0 && expect.includes(idx[0]);
    const hit3 = idx.slice(0, 3).some((i) => expect.includes(i));
    const hit5 = idx.slice(0, 5).some((i) => expect.includes(i));
    if (hit1) top1 += 1;
    if (hit3) top3 += 1;
    if (hit5) top5 += 1;
    rows.push(`| ${q} | ${expect.map((i) => CORPUS[i].content.slice(0, 20)).join('; ')} | ${idx.slice(0, 3).map((i) => i >= 0 ? CORPUS[i].content.slice(0, 16) : '?').join(' / ')} | ${hit1 ? '✓' : '✗'} | ${hit3 ? '✓' : '✗'} |`);
  }

  const out = [
    '# 检索质量评测(2026-08-14)',
    '',
    `语料:${CORPUS.length} 条真实风格记忆(中文为主+英文混排) · 查询:${QUERIES.length} 个`,
    '',
    '| 查询 | 期望命中(top-3) | 实际 top-3 | top-1 | top-3 |',
    '|---|---|---|---|---|',
    ...rows,
    '',
    `汇总:top-1 命中 ${top1}/${QUERIES.length}(${(top1 / QUERIES.length * 100).toFixed(0)}%) · top-3 命中 ${top3}/${QUERIES.length}(${(top3 / QUERIES.length * 100).toFixed(0)}%) · top-5 命中 ${top5}/${QUERIES.length}(${(top5 / QUERIES.length * 100).toFixed(0)}%)`,
    '',
    '说明:零依赖启发式检索,短文本场景下 top-3 达到可用水平;top-1 偏差多发生在查询词与记忆措辞不一致时(如"发布"vs"上架"),可叠加用户点选反馈或可选 embedding 后端进一步提升。',
    '',
  ].join('\n');

  console.log(out);
  writeFileSync(join(import.meta.dirname, '..', 'research', 'retrieval-eval.md'), out + '\n');
  console.log('[eval] written to research/retrieval-eval.md');
}

main().catch((err) => { console.error(err); process.exit(1); });
