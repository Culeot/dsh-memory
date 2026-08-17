/**
 * Zero-dependency retrieval for memory records. Memory entries are short
 * (<= 2000 chars), so the scoring model is deliberately simple and
 * explainable: exact substring + token overlap, weighted by importance,
 * recency (half-life decay), and access count. No vector database, no LLM
 * call, no embedding — works offline on every platform, and the whole index
 * is recomputed per query (400 records max keeps this cheap).
 *
 * @module dsh-agent-memory/search
 */
import type { MemoryRecord } from './spec.ts';
/** Split text into lowercase tokens: ASCII word runs + individual CJK chars. */
export declare function tokenize(text: string): string[];
/** Unique token set. */
export declare function tokenSet(text: string): Set<string>;
/**
 * Bigram tokenizer: ASCII word runs + CJK bigrams (sliding windows of two
 * consecutive CJK chars; a CJK run shorter than 2 chars contributes single
 * chars). Bigrams carry far more information than single chars, which makes
 * Chinese recall noticeably more precise — "苹果" no longer partially matches
 * "水果摊" through the shared char "果".
 */
export declare function tokenizeBigram(text: string): string[];
export declare function tokenSetBigram(text: string): Set<string>;
/** Loose matching signal: pure CJK unigrams (never used alone). */
export declare function cjkUnigrams(text: string): Set<string>;
/** Jaccard similarity of two token sets, 0..1. */
export declare function jaccard(a: Set<string>, b: Set<string>): number;
export interface RankOptions {
    /** Current time as epoch ms; injectable for tests. */
    now?: number;
    /** Recency half-life in days. */
    recencyHalfLifeDays?: number;
}
export interface ScoredRecord {
    record: MemoryRecord;
    score: number;
    /** Human-readable hit reasons (query ranking only; absent for hot set). */
    reasons?: string[];
}
/**
 * Minimum matching strength (base score) for a record to be considered a hit.
 * Base contributions: substring hit = 3, tag hit = 1.5, bigram Jaccard ≤ 2,
 * unigram Jaccard ≤ 0.8 (pure single-char coincidence can never reach 1.0).
 * A threshold of 1.0 therefore keeps every strong match (substring/tag/decent
 * bigram) while discarding pure single-char noise — the source of "unrelated
 * association" on short queries like "ok了吗".
 */
export declare const MATCH_BASE_MIN = 1;
/**
 * Whether a query carries enough retrieval information to bother searching.
 * Short/filler queries ("ok了吗", "可以吗") would otherwise surface weak
 * matches — pure token waste. Requires ≥2 meaningful CJK chars or ≥1 ASCII
 * word of length ≥3.
 */
export declare function hasMeaningfulQuery(query: string): boolean;
/**
 * BM25-style term-frequency signal (single-document collection, no idf).
 * Query bigram tokens are matched against content bigram frequencies with
 * length normalization: short content is rewarded for hits, long content is
 * not penalized for wordiness. Scaled and capped so it can only add up to
 * +2.0 to the base score.
 */
export declare function bm25Signal(query: string, content: string, avgLen?: number): number;
export interface ExplainResult {
    score: number;
    /** Human-readable reasons, best-contributing first. */
    reasons: string[];
}
/**
 * Score one record against a query and explain why it scored. 0 when the
 * query is empty or the match is too weak to be meaningful.
 * score = base * importanceBoost * recencyBoost * accessBoost
 * where base = 3*substring + 1.5*tag + 1.2*qwordHits + 2*bigramJaccard +
 * 0.8*unigramJaccard + bm25, and base < MATCH_BASE_MIN is no match.
 * Reasons mirror the exact contributions, so both the user and the agent can
 * audit "why did this memory surface".
 */
export declare function explainRecord(record: MemoryRecord, query: string, options?: RankOptions): ExplainResult;
/** Compatibility wrapper: plain score (existing API/tests keep working). */
export declare function scoreRecord(record: MemoryRecord, query: string, options?: RankOptions): number;
/** Retired records: expired by TTL. */
export declare function isExpired(record: MemoryRecord, now?: number): boolean;
/**
 * Hot-memory score (no query): how strongly one record belongs in the small
 * always-visible working set. recency (last activity: update OR recall hit) +
 * importance + access count. Recalling a record refreshes accessedAt, so
 * frequently used memories genuinely rise into the hot set on their own.
 */
export declare function hotnessScore(record: MemoryRecord, options?: RankOptions): number;
/**
 * The hot working set: top records by hotness, excluding expired ones.
 * This is the "hot memory" tier — the few entries worth injecting into every
 * session — while the full table remains the "memory bank" queried on demand.
 */
export declare function hotRecords(records: readonly MemoryRecord[], limit: number, options?: RankOptions): ScoredRecord[];
/**
 * Rank non-expired records against a query and return the top `limit`.
 * Records with score 0 are dropped; ties keep insertion order (stable).
 */
export declare function rankRecords(records: readonly MemoryRecord[], query: string, limit: number, options?: RankOptions): ScoredRecord[];
//# sourceMappingURL=search.d.ts.map