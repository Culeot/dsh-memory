/**
 * dsh-agent-memory web client: a memory browser panel in Settings →
 * "记忆"(dsh-agent-memory). Browse stats, filter by kind, search, delete.
 * Talks to the host via the `memory-read` / `memory-write` RPC channels
 * registered by src/rpc.ts.
 *
 * @module dsh-agent-memory/client
 */
import { useCallback, useEffect, useState } from 'react';
import Schema from '@deepseek-ai/schemastery';

export const name = 'memory-ui';
export const inject = ['slots'];
export const Config = Schema.object({});

const READ = '/dsh-memory-read';
const WRITE = '/dsh-memory-write';

const KIND_LABEL: Record<string, string> = {
  fact: '事实', preference: '偏好', decision: '决策', lesson: '教训', todo: '待办', note: '笔记',
};

type RpcConnection = {
  rpc: {
    call(channel: string, method: string, payload?: Record<string, unknown>):
      Promise<{ ok: boolean; value?: unknown; error?: { code: string; message: string; details?: Record<string, unknown> } }>;
  };
};

interface Entry {
  id: string;
  content: string;
  kind: string;
  tags: string[];
  scope: string;
  importance: number;
  updatedAt: string;
  expiresAt: string | null;
}

const card: React.CSSProperties = {
  border: '1px solid var(--dsw-alias-border-normal, #555)',
  borderRadius: 8,
  padding: '12px 16px',
  marginBottom: 8,
  background: 'var(--dsw-alias-bg-layer-1, #1f1f1f)',
};
const meta: React.CSSProperties = { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 };
const badge: React.CSSProperties = {
  fontSize: 11, padding: '1px 7px', borderRadius: 10,
  border: '1px solid var(--dsw-alias-border-normal, #666)',
  color: 'var(--dsw-alias-text-secondary, #aaa)',
};
const contentStyle: React.CSSProperties = { margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'inherit', fontSize: 13, lineHeight: 1.55 };
const row: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' };
const inputStyle: React.CSSProperties = {
  padding: '4px 8px', borderRadius: 6, fontSize: 13, color: 'inherit',
  border: '1px solid var(--dsw-alias-border-normal, #666)',
  background: 'var(--dsw-alias-bg-layer-1, #2a2a2a)',
};
const btn: React.CSSProperties = {
  padding: '3px 10px', borderRadius: 6, fontSize: 12, color: 'inherit', cursor: 'pointer',
  border: '1px solid var(--dsw-alias-border-normal, #666)',
  background: 'var(--dsw-alias-bg-layer-1, #2a2a2a)',
};
const delBtn: React.CSSProperties = { ...btn, color: '#e5484d', borderColor: '#e5484d80' };
const danger: React.CSSProperties = { color: '#e5484d' };
const muted: React.CSSProperties = { color: 'var(--dsw-alias-text-secondary, #999)' };

export function apply(ctx: { get(key: string): unknown; slots: { inject(slot: string, fn: () => unknown): void } }, _config: unknown): void {
  const connection = ctx.get('connection') as RpcConnection | undefined;
  if (!connection) return;
  // Top-level settings nav entry — same menu level as 通用设置/模型/插件.
  // `settings.section` registers one page per nav entry (id/order/label).
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'memory',
    order: 25,
    label: () => '记忆',
    inject: () => ({ connection }),
  }, MemoryPanel));
}

function MemoryPanel({ connection }: { connection: RpcConnection }) {
  const [stats, setStats] = useState<{ total: number; expired: number; byKind: Record<string, number> } | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<{ id: string; content: string; tags: string; importance: number } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [creating, setCreating] = useState<{ content: string; kind: string; tags: string; scope: string; importance: number } | null>(null);

  const load = useCallback(async (q: string, k: string) => {
    setBusy(true);
    setError('');
    try {
      const s = await connection.rpc.call(READ, 'stats');
      if (s.ok) setStats(s.value as { total: number; expired: number; byKind: Record<string, number> });
      let l;
      if (q.trim() !== '') {
        l = await connection.rpc.call(READ, 'search', { query: q, limit: 20, content_max: 300 });
        if (l.ok) {
          const v = l.value as { results: Entry[] };
          setEntries(v.results.map((r) => ({ ...r, tags: r.tags ?? [], scope: r.scope ?? 'project', updatedAt: r.updatedAt ?? '', expiresAt: null })));
        }
      } else {
        l = await connection.rpc.call(READ, 'list', k ? { kinds: [k], limit: 100 } : { limit: 100 });
        if (l.ok) setEntries((l.value as { entries: Entry[] }).entries ?? []);
      }
      if (!l.ok) setError(l.error?.message ?? '加载失败');
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }, [connection]);

  useEffect(() => { void load('', ''); }, [load]);

  const remove = async (id: string) => {
    const r = await connection.rpc.call(WRITE, 'forget', { id, confirm: true });
    if (!r.ok) { setError(r.error?.message ?? '删除失败'); setConfirmId(null); return; }
    setConfirmId(null);
    void load(query, kind);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const tags = editing.tags.split(/[,，\s]+/).map((t) => t.trim().toLowerCase()).filter(Boolean);
    const r = await connection.rpc.call(WRITE, 'update', { id: editing.id, content: editing.content, tags, importance: editing.importance });
    if (!r.ok) { setError(r.error?.message ?? '保存失败'); return; }
    setEditing(null);
    void load(query, kind);
  };

  const saveCreate = async () => {
    if (!creating) return;
    const tags = creating.tags.split(/[,，\s]+/).map((t) => t.trim().toLowerCase()).filter(Boolean);
    const r = await connection.rpc.call(WRITE, 'remember', {
      content: creating.content, kind: creating.kind, tags, scope: creating.scope, importance: creating.importance,
    });
    if (!r.ok) { setError(r.error?.message ?? '保存失败'); return; }
    setCreating(null);
    void load(query, kind);
  };

  return (
    <div style={{ fontFamily: 'inherit' }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>记忆(dsh-agent-memory)</div>
      {stats && (
        <div style={{ ...row, ...muted, marginBottom: 10, fontSize: 12, gap: 12 }}>
          <span>共 {stats.total} 条</span>
          {stats.expired > 0 && <span style={danger}>已过期 {stats.expired}</span>}
          {Object.entries(stats.byKind).map(([k, n]) => (
            <span key={k}>{KIND_LABEL[k] ?? k} {n}</span>
          ))}
        </div>
      )}
      <div style={{ ...row, marginBottom: 10 }}>
        <input
          style={{ ...inputStyle, width: 180 }}
          placeholder="搜索记忆…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void load(query, kind); }}
        />
        <select style={inputStyle} value={kind} onChange={(e) => { setKind(e.target.value); void load(query, e.target.value); }}>
          <option value="">全部类型</option>
          {Object.entries(KIND_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <button style={btn} onClick={() => void load(query, kind)} disabled={busy}>{busy ? '加载中…' : '查询'}</button>
        <button style={{ ...btn, marginLeft: 'auto', fontWeight: 600 }} onClick={() => setCreating({ content: '', kind: 'fact', tags: '', scope: 'user', importance: 2 })}>＋ 新建</button>
      </div>
      {error !== '' && <div style={{ ...danger, fontSize: 12, marginBottom: 8 }}>{error}</div>}
      {creating && (
        <div style={card}>
          <textarea
            style={{ ...inputStyle, width: '100%', minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
            placeholder="要记住的内容…"
            value={creating.content}
            onChange={(ev) => setCreating({ ...creating, content: ev.target.value })}
          />
          <div style={{ ...row, marginTop: 6 }}>
            <select style={inputStyle} value={creating.kind} onChange={(ev) => setCreating({ ...creating, kind: ev.target.value })}>
              {Object.entries(KIND_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
            <select style={inputStyle} value={creating.scope} onChange={(ev) => setCreating({ ...creating, scope: ev.target.value })}>
              <option value="user">全局</option>
              <option value="project">项目</option>
            </select>
            <select style={inputStyle} value={creating.importance} onChange={(ev) => setCreating({ ...creating, importance: Number(ev.target.value) })}>
              <option value={1}>重要度 1</option>
              <option value={2}>重要度 2</option>
              <option value={3}>重要度 3</option>
            </select>
            <input
              style={{ ...inputStyle, flex: 1, minWidth: 120 }}
              placeholder="标签,逗号分隔"
              value={creating.tags}
              onChange={(ev) => setCreating({ ...creating, tags: ev.target.value })}
            />
            <button style={btn} onClick={() => void saveCreate()} disabled={creating.content.trim() === ''}>保存</button>
            <button style={btn} onClick={() => setCreating(null)}>取消</button>
          </div>
        </div>
      )}
      {entries.length === 0 && !busy && <div style={{ ...muted, fontSize: 13 }}>暂无记忆</div>}
      {entries.map((e) => (
        <div key={e.id} style={card}>
          {editing?.id === e.id ? (
            <div>
              <textarea
                style={{ ...inputStyle, width: '100%', minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
                value={editing.content}
                onChange={(ev) => setEditing({ ...editing, content: ev.target.value })}
              />
              <div style={{ ...row, marginTop: 6 }}>
                <input
                  style={{ ...inputStyle, flex: 1, minWidth: 120 }}
                  placeholder="标签,逗号分隔"
                  value={editing.tags}
                  onChange={(ev) => setEditing({ ...editing, tags: ev.target.value })}
                />
                <select style={inputStyle} value={editing.importance} onChange={(ev) => setEditing({ ...editing, importance: Number(ev.target.value) })}>
                  <option value={1}>重要度 1</option>
                  <option value={2}>重要度 2</option>
                  <option value={3}>重要度 3</option>
                </select>
                <button style={btn} onClick={() => void saveEdit()}>保存</button>
                <button style={btn} onClick={() => setEditing(null)}>取消</button>
              </div>
            </div>
          ) : (
            <>
              <div style={meta}>
                <span style={badge}>{KIND_LABEL[e.kind] ?? e.kind}</span>
                <span style={badge}>重要度 {e.importance}</span>
                <span style={badge}>{e.scope === 'user' ? '全局' : '项目'}</span>
                {e.tags.slice(0, 4).map((t) => <span key={t} style={badge}>#{t}</span>)}
                <span style={{ ...muted, marginLeft: 'auto', fontSize: 11 }}>{e.updatedAt?.slice(0, 10)}</span>
              </div>
              <p style={contentStyle}>{e.content}</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {confirmId === e.id ? (
                  <>
                    <span style={{ ...muted, fontSize: 12 }}>确认删除这条记忆?</span>
                    <button style={delBtn} onClick={() => void remove(e.id)}>删除</button>
                    <button style={btn} onClick={() => setConfirmId(null)}>取消</button>
                  </>
                ) : (
                  <>
                    <button style={btn} onClick={() => setEditing({ id: e.id, content: e.content, tags: e.tags.join(', '), importance: e.importance })}>编辑</button>
                    <button style={delBtn} onClick={() => setConfirmId(e.id)}>删除</button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
