// Pure overlap-column packing for a day's time-blocked entries — "overlapping
// items side by side" (CLAUDE.md §5 / PROMPTS.md Phase 3). Zero React imports.
//
// Standard calendar-app packing: sort by start time, grow a "cluster" of mutually
// overlapping items, and within a cluster greedily reuse the first column whose
// last item has already ended. All items in a cluster share the same column count,
// so widths stay uniform rather than being individually re-optimised — simpler,
// and correct for the small (<50) per-day item counts this app deals with.

export interface LayoutInput {
  id: string;
  start: number; // minutes from day-start, inclusive
  end: number; // minutes from day-start, exclusive
}

export interface LayoutResult {
  col: number; // 0-indexed column within this item's cluster
  cols: number; // total columns in this item's cluster
}

export function layoutDay(items: LayoutInput[]): Map<string, LayoutResult> {
  const sorted = [...items].sort((a, b) => a.start - b.start);
  const result = new Map<string, LayoutResult>();
  const assignment = new Map<string, number>(); // id -> column, within the current cluster

  let cluster: LayoutInput[] = [];
  let columnEnds: number[] = [];

  function flush(): void {
    const cols = columnEnds.length;
    for (const item of cluster) {
      result.set(item.id, { col: assignment.get(item.id)!, cols });
    }
    cluster = [];
    columnEnds = [];
  }

  for (const item of sorted) {
    const activeMax = columnEnds.length ? Math.max(...columnEnds) : -Infinity;
    if (item.start >= activeMax) flush();

    let col = columnEnds.findIndex((end) => end <= item.start);
    if (col === -1) {
      col = columnEnds.length;
      columnEnds.push(item.end);
    } else {
      columnEnds[col] = item.end;
    }

    assignment.set(item.id, col);
    cluster.push(item);
  }
  flush();

  return result;
}
