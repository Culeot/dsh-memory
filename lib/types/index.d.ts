import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { UserMessage } from '@deepseek-ai/dsh-session';
import { type MemoryRecord, type MemoryKind, type MemoryScope } from './spec.ts';
export * from './spec.ts';
export * from './search.ts';
export declare const name = "memory";
export declare const inject: string[];
/** Schemastery config (same convention as the official dsh-tool-* plugins). */
export declare const Config: z<Schemastery.ObjectS<{
    maxRecords: z<number, number>;
    maxContentChars: z<number, number>;
    recencyHalfLifeDays: z<number, number>;
    mergeSimilarity: z<number, number>;
    /** Register the memory-protocol system-prompt section. */
    protocolSection: z<boolean, boolean>;
    /**
     * Per-step dynamic injection: before each model step, recall the most
     * relevant memories for the user's current message and append them to the
     * step input. Replaces the old every-turn hot-memory broadcast (stateContext)
     * — relevant-on-demand instead of broadcast.
     */
    injectEnabled: z<boolean, boolean>;
    /** Maximum memories to inject per step (0 disables injection). Actual count depends on relevance. */
    injectCount: z<number, number>;
    /** Minimum score threshold for injection (0 = no threshold, just use rank). */
    injectMinScore: z<number, number>;
    /** Max content chars per injected memory summary. */
    injectMaxChars: z<number, number>;
    /** Default max chars of a recalled record's content shown to the model. */
    recallContentMax: z<number, number>;
    /** memory_sediment: max entries per call. */
    sedimentMaxEntries: z<number, number>;
    /** memory_sediment: min ms between calls; 0 disables the cooldown. */
    sedimentCooldownMs: z<number, number>;
    /**
     * Lesson auto-solidification: when the SAME error fingerprint (code/message)
     * fires this many times, inject a nudge telling the agent to write it as an
     * importance-3 lesson. The lesson then auto-injects on related topics,
     * preventing recurrence. 0 disables.
     */
    lessonizeEnabled: z<boolean, boolean>;
    lessonizeAfter: z<number, number>;
}>, Schemastery.ObjectT<{
    maxRecords: z<number, number>;
    maxContentChars: z<number, number>;
    recencyHalfLifeDays: z<number, number>;
    mergeSimilarity: z<number, number>;
    /** Register the memory-protocol system-prompt section. */
    protocolSection: z<boolean, boolean>;
    /**
     * Per-step dynamic injection: before each model step, recall the most
     * relevant memories for the user's current message and append them to the
     * step input. Replaces the old every-turn hot-memory broadcast (stateContext)
     * — relevant-on-demand instead of broadcast.
     */
    injectEnabled: z<boolean, boolean>;
    /** Maximum memories to inject per step (0 disables injection). Actual count depends on relevance. */
    injectCount: z<number, number>;
    /** Minimum score threshold for injection (0 = no threshold, just use rank). */
    injectMinScore: z<number, number>;
    /** Max content chars per injected memory summary. */
    injectMaxChars: z<number, number>;
    /** Default max chars of a recalled record's content shown to the model. */
    recallContentMax: z<number, number>;
    /** memory_sediment: max entries per call. */
    sedimentMaxEntries: z<number, number>;
    /** memory_sediment: min ms between calls; 0 disables the cooldown. */
    sedimentCooldownMs: z<number, number>;
    /**
     * Lesson auto-solidification: when the SAME error fingerprint (code/message)
     * fires this many times, inject a nudge telling the agent to write it as an
     * importance-3 lesson. The lesson then auto-injects on related topics,
     * preventing recurrence. 0 disables.
     */
    lessonizeEnabled: z<boolean, boolean>;
    lessonizeAfter: z<number, number>;
}>>;
/** Extract a search query from the user messages claimed by this step. */
export declare function queryFromMessages(messages: readonly UserMessage[]): string;
/** Render recalled memories into a compact injection block. */
export declare function renderInjection(results: RecallResult['results'], maxChars: number): string;
/**
 * Stable fingerprint of an error for same-mistake counting. Prefer a typed
 * code; fall back to the first meaningful line of the message.
 */
export declare function extractErrorFingerprint(error: unknown): string;
export type RememberResult = {
    id: string;
    merged: boolean;
    evicted: number;
    content: string;
};
export type RecallResult = {
    results: Array<{
        id: string;
        content: string;
        kind: MemoryKind;
        tags: string[];
        scope: MemoryScope;
        importance: number;
        updatedAt: string;
        score: number;
        /** Human-readable hit reasons (query recall only; absent for hot set). */
        reasons?: string[];
    }>;
    /** Records that matched (after filters), before the limit cut. */
    totalMatched: number;
    /** Records actually returned (== results.length). */
    returned: number;
};
export type IndexResult = {
    total: number;
    expired: number;
    byKind: Record<string, number>;
    entries: Array<{
        id: string;
        content: string;
        kind: MemoryKind;
        tags: string[];
        scope: MemoryScope;
        importance: number;
        updatedAt: string;
    }>;
};
export type ForgetResult = {
    deleted: number;
    /** importance-3 records skipped (they need confirm: true). */
    skippedImportant: number;
};
export type MemoryTable = {
    get(key: string): MemoryRecord | undefined;
    entries(): IterableIterator<[string, MemoryRecord]>;
    put(key: string, value: MemoryRecord): Promise<void>;
    update(key: string, fn: (current: MemoryRecord) => MemoryRecord): Promise<MemoryRecord>;
    delete(key: string): Promise<boolean>;
    readonly size: number;
};
/**
 * Pure governance/read/write core over an opened domain table. Split out so
 * tests can drive it without a live cordis context.
 *
 * `beforeWrite` is an optional external-modification guard: called before every
 * mutating operation. Throw to refuse the write (the caller turns it into a
 * clear error) — the fail-safe that prevents an in-memory state from silently
 * overwriting a file another process edited.
 */
export declare class MemoryCore {
    private readonly table;
    private readonly config;
    private readonly beforeWrite?;
    /**
     * Called after EVERY durable write lands (each put/update/delete). The
     * external-modification guard compares fingerprints before a write, so the
     * baseline must be refreshed after each real write — not after a whole
     * multi-write operation (import) — otherwise the second write of a batch
     * is falsely rejected as "externally modified".
     */
    private readonly onWritten?;
    constructor(table: MemoryTable, config: {
        maxRecords: number;
        maxContentChars: number;
        mergeSimilarity: number;
        recencyHalfLifeDays: number;
    }, beforeWrite?: (() => void) | undefined, 
    /**
     * Called after EVERY durable write lands (each put/update/delete). The
     * external-modification guard compares fingerprints before a write, so the
     * baseline must be refreshed after each real write — not after a whole
     * multi-write operation (import) — otherwise the second write of a batch
     * is falsely rejected as "externally modified".
     */
    onWritten?: (() => void) | undefined);
    private all;
    private guardWrite;
    private put;
    private update;
    private delete;
    /** Delete every TTL-expired record. Returns the number removed. */
    purgeExpired(now?: number): Promise<number>;
    /**
     * Evict lowest-value records until the table fits maxRecords. importance-3
     * records are eviction-proof unless the whole store is full of them — in
     * that case the oldest importance-3 record goes, so the store can never
     * deadlock while still honoring "critical survives space pressure".
     */
    private evict;
    /** Insert or merge one memory. */
    remember(input: {
        content: string;
        kind: string;
        tags?: readonly string[];
        scope: string;
        project?: string | null;
        importance?: number;
        ttlDays?: number;
        now?: number;
    }): Promise<RememberResult>;
    /**
     * Ranked recall with kind/tag/scope filters and access tracking.
     * `touch: false` skips the access-count write-back entirely — used by the
     * per-step injection path so passive recall never triggers a disk write.
     */
    recall(input: {
        query: string;
        kinds?: readonly string[];
        tags?: readonly string[];
        scope?: string;
        project?: string | null;
        limit?: number;
        now?: number;
        touch?: boolean;
        /** Max content chars per result; longer content is truncated (cheaper calls). */
        contentMax?: number;
    }): Promise<RecallResult>;
    /** Read-only single record lookup (used by the UI RPC layer). */
    getById(id: string): MemoryRecord | undefined;
    /**
     * Read-only inventory view for the UI panel: never purges/writes, so a
     * passive page load can't mutate the store. Mirrors index() minus the
     * purge and without touching access stats.
     */
    inspect(input: {
        kinds?: readonly string[];
        tags?: readonly string[];
        scope?: string;
        limit?: number;
        offset?: number;
        now?: number;
    }): {
        total: number;
        expired: number;
        byKind: Record<string, number>;
        entries: Array<{
            id: string;
            content: string;
            kind: MemoryKind;
            tags: string[];
            scope: MemoryScope;
            importance: number;
            updatedAt: string;
            expiresAt: string | null;
        }>;
    };
    /** Full inventory with stats (title-level listing to bound token cost). */
    index(input: {
        kinds?: readonly string[];
        tags?: readonly string[];
        scope?: string;
        limit?: number;
        offset?: number;
        now?: number;
    }): Promise<IndexResult>;
    /** Delete by id, or by tag set (optionally scoped). importance-3 ids need confirm. */
    forget(input: {
        id?: string;
        tags?: readonly string[];
        scope?: string;
        confirm?: boolean;
        now?: number;
    }): Promise<ForgetResult>;
    /** Manual edit from the UI panel: overwrite content/tags/importance directly. */
    updateContent(input: {
        id: string;
        content?: string;
        tags?: readonly string[];
        importance?: number;
        now?: number;
    }): Promise<{
        id: string;
        updated: boolean;
    }>;
    stats(): {
        total: number;
        byKind: Record<string, number>;
    };
}
export declare function apply(ctx: Context, config: Schemastery.TypeT<typeof Config>): Promise<void>;
//# sourceMappingURL=index.d.ts.map