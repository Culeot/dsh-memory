/**
 * UI-facing RPC layer: lets the web client panel browse and manage memories
 * without going through the model tools. Two channels:
 *   - `memory-read`  (authority: trusted-host) — stats / list / search / get
 *   - `memory-write` (authority: loopback)     — forget (destructive)
 * Read channel never mutates the store (uses MemoryCore.inspect).
 *
 * @module dsh-agent-memory/rpc
 */
import type { MemoryCore } from './index.ts';

export const MEMORY_READ_CHANNEL = '/dsh-memory-read';
export const MEMORY_WRITE_CHANNEL = '/dsh-memory-write';

export interface RpcResult<T = unknown> {
  ok: boolean;
  value?: T;
  error?: { code: string; message: string; details: Record<string, unknown> };
}

type RpcHandler = (method: string, payload: Record<string, unknown>) => Promise<RpcResult> | RpcResult;

export interface RpcConnection {
  rpc: {
    handle(channel: string, handler: RpcHandler, options?: { authority?: string }): void;
  };
}

function ok(value: unknown): RpcResult {
  return { ok: true, value };
}

function fail(code: string, message: string): RpcResult {
  return { ok: false, error: { code, message, details: {} } };
}

function str(payload: Record<string, unknown>, key: string): string | undefined {
  const v = payload[key];
  return typeof v === 'string' && v !== '' ? v : undefined;
}

function arr(payload: Record<string, unknown>, key: string): string[] | undefined {
  const v = payload[key];
  return Array.isArray(v) ? v.map(String) : undefined;
}

function num(payload: Record<string, unknown>, key: string): number | undefined {
  const v = payload[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function createReadHandler(core: MemoryCore): RpcHandler {
  return async (method, payload) => {
    try {
      switch (method) {
        case 'stats': {
          const { total, byKind } = core.stats();
          const expired = core.inspect({}).expired;
          return ok({ total, byKind, expired });
        }
        case 'list':
          return ok(core.inspect({
            kinds: arr(payload, 'kinds'),
            tags: arr(payload, 'tags'),
            scope: str(payload, 'scope'),
            limit: num(payload, 'limit'),
            offset: num(payload, 'offset'),
          }));
        case 'get': {
          const id = str(payload, 'id');
          if (!id) return fail('bad-request', 'id required');
          const record = core.getById(id);
          return record ? ok(record) : fail('not-found', `no memory ${id}`);
        }
        case 'search': {
          const query = str(payload, 'query');
          if (!query) return fail('bad-request', 'query required');
          const result = await core.recall({
            query,
            limit: num(payload, 'limit') ?? 10,
            touch: false,
            contentMax: num(payload, 'content_max'),
          });
          return ok(result);
        }
        default:
          return fail('bad-request', `unknown method ${method}`);
      }
    } catch (error) {
      return fail('internal', error instanceof Error ? error.message : String(error));
    }
  };
}

function createWriteHandler(core: MemoryCore): RpcHandler {
  return async (method, payload) => {
    try {
      switch (method) {
        case 'forget': {
          const id = str(payload, 'id');
          if (!id) return fail('bad-request', 'id required');
          const out = await core.forget({ id, confirm: payload.confirm === true });
          return ok(out);
        }
        case 'update': {
          const id = str(payload, 'id');
          if (!id) return fail('bad-request', 'id required');
          const out = await core.updateContent({
            id,
            content: typeof payload.content === 'string' ? payload.content : undefined,
            tags: arr(payload, 'tags'),
            importance: num(payload, 'importance'),
          });
          return ok(out);
        }
        case 'remember': {
          const content = typeof payload.content === 'string' ? payload.content.trim() : '';
          if (content === '') return fail('bad-request', 'content required');
          const out = await core.remember({
            content,
            kind: typeof payload.kind === 'string' && payload.kind !== '' ? payload.kind : 'note',
            tags: arr(payload, 'tags'),
            scope: typeof payload.scope === 'string' && payload.scope !== '' ? payload.scope : 'user',
            importance: num(payload, 'importance'),
          });
          return ok(out);
        }
        default:
          return fail('bad-request', `unknown method ${method}`);
      }
    } catch (error) {
      return fail('internal', error instanceof Error ? error.message : String(error));
    }
  };
}

export function registerRpc(connection: RpcConnection, core: MemoryCore): void {
  connection.rpc.handle(MEMORY_READ_CHANNEL, createReadHandler(core), { authority: 'trusted-host' });
  connection.rpc.handle(MEMORY_WRITE_CHANNEL, createWriteHandler(core), { authority: 'loopback' });
}
