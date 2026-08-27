// In-memory inverted-index search (PROMPTS.md Phase 11: "under 50ms at 10,000
// entries — tell me your indexing approach before building it"). Zero React
// imports.
//
// Approach: tokenize title/body/tags into lowercase word tokens and build a
// token -> Set<entryId> postings map. A search tokenizes the query and, per
// query token, does a prefix scan over the (small, deduplicated) vocabulary
// rather than the (large, growing) entry corpus — then intersects the postings
// sets across query tokens (AND semantics). Rebuilding the whole index is
// O(entries), same order as a linear scan, but it only needs to happen when
// the underlying data actually changes (Today.tsx's screens already get this
// for free via useLiveQuery + useMemo — see Notes.tsx); every keystroke while
// typing a query only touches the index, never the entries table again.
// Verified empirically against a synthetic 10,000-entry corpus — see the
// Phase 11 chat report for the real numbers, not just this reasoning.

import type { Entry } from '../data/types';

export interface SearchIndex {
  postings: Map<string, Set<string>>;
  entriesById: Map<string, Entry>;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

export function buildSearchIndex(entries: Entry[]): SearchIndex {
  const postings = new Map<string, Set<string>>();
  const entriesById = new Map<string, Entry>();

  function addToken(token: string, id: string): void {
    let ids = postings.get(token);
    if (!ids) {
      ids = new Set();
      postings.set(token, ids);
    }
    ids.add(id);
  }

  // No per-entry Set just to dedupe before adding — adding the same id to the
  // same token's posting set twice is already a no-op, so building one first
  // is pure overhead. See the Phase 11 chat report for the measured before/
  // after build time this saved on a synthetic 10,000-entry corpus.
  for (const entry of entries) {
    entriesById.set(entry.id, entry);
    for (const token of tokenize(entry.title)) addToken(token, entry.id);
    if (entry.body) for (const token of tokenize(entry.body)) addToken(token, entry.id);
    for (const tag of entry.tags) addToken(tag.toLowerCase(), entry.id);
  }

  return { postings, entriesById };
}

function intersect(a: Set<string>, b: Set<string>): Set<string> {
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  const result = new Set<string>();
  for (const id of small) if (large.has(id)) result.add(id);
  return result;
}

/**
 * AND across query tokens (every word must match somewhere), prefix match per
 * token (so "rec" finds "recipe") — a plain equality index wouldn't support
 * that, and a search box that only matched whole words would feel broken.
 */
export function searchIndex(index: SearchIndex, query: string): Entry[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  let resultIds: Set<string> | null = null;
  for (const queryToken of queryTokens) {
    const matches = new Set<string>();
    for (const [token, ids] of index.postings) {
      if (token.startsWith(queryToken)) {
        for (const id of ids) matches.add(id);
      }
    }
    resultIds = resultIds === null ? matches : intersect(resultIds, matches);
    if (resultIds.size === 0) break;
  }

  const ids = resultIds ?? new Set<string>();
  const results: Entry[] = [];
  for (const id of ids) {
    const entry = index.entriesById.get(id);
    if (entry) results.push(entry);
  }
  return results;
}
