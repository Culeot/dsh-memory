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
export declare const MEMORY_READ_CHANNEL = "/dsh-memory-read";
export declare const MEMORY_WRITE_CHANNEL = "/dsh-memory-write";
export interface RpcResult<T = unknown> {
    ok: boolean;
    value?: T;
    error?: {
        code: string;
        message: string;
        details: Record<string, unknown>;
    };
}
type RpcHandler = (method: string, payload: Record<string, unknown>) => Promise<RpcResult> | RpcResult;
export interface RpcConnection {
    rpc: {
        handle(channel: string, handler: RpcHandler, options?: {
            authority?: string;
        }): void;
    };
}
export declare function registerRpc(connection: RpcConnection, core: MemoryCore): void;
export {};
//# sourceMappingURL=rpc.d.ts.map