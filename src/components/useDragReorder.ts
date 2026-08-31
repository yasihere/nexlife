import { useRef, useState, type PointerEvent } from 'react';

interface UseDragReorderOptions {
  /** Current order from the query — the source of truth between drags. */
  ids: string[];
  onDrop: (orderedIds: string[]) => void;
}

interface RowMid {
  id: string;
  mid: number;
}

interface DragReorderApi {
  draggingId: string | null;
  /** Vertical offset (px), applied as a transform to the dragged row only —
   *  other rows don't move until drop, then the list snaps to the new order
   *  (CLAUDE.md §5: "the Now Line jumps rather than transitions" — same
   *  preference applied here, and it sidesteps the live-reflow bugs a
   *  hand-rolled drag implementation is otherwise prone to). */
  offsetY: number;
  registerRow: (id: string, el: HTMLElement | null) => void;
  handlePointerDown: (id: string, e: PointerEvent) => void;
  handlePointerMove: (e: PointerEvent) => void;
  handlePointerUp: (e: PointerEvent) => void;
}

/**
 * Hand-rolled pointer-based vertical drag reorder (no library — CLAUDE.md
 * §2), shared by Today's Unscheduled list and Notes. A DragHandle starts the
 * gesture, so it never competes with a row's own tap/long-press. Row
 * positions are measured once at pointerdown, not re-read during the move —
 * nothing else moves until drop, so those measurements stay valid for the
 * whole gesture. Doesn't auto-scroll the list near its edges (personal-scale
 * lists rarely need it — a known limitation, not an oversight).
 */
export function useDragReorder({ ids, onDrop }: UseDragReorderOptions): DragReorderApi {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [offsetY, setOffsetY] = useState(0);
  const rowRefs = useRef(new Map<string, HTMLElement>());
  const drag = useRef<{ id: string; startY: number; rows: RowMid[] } | null>(null);

  function registerRow(id: string, el: HTMLElement | null): void {
    if (el) rowRefs.current.set(id, el);
    else rowRefs.current.delete(id);
  }

  function handlePointerDown(id: string, e: PointerEvent): void {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rows: RowMid[] = [];
    for (const rowId of ids) {
      const rect = rowRefs.current.get(rowId)?.getBoundingClientRect();
      if (rect) rows.push({ id: rowId, mid: rect.top + rect.height / 2 });
    }
    drag.current = { id, startY: e.clientY, rows };
    setDraggingId(id);
    setOffsetY(0);
  }

  function handlePointerMove(e: PointerEvent): void {
    if (!drag.current) return;
    setOffsetY(e.clientY - drag.current.startY);
  }

  function handlePointerUp(e: PointerEvent): void {
    const info = drag.current;
    drag.current = null;
    setDraggingId(null);
    setOffsetY(0);
    if (!info) return;

    // First row whose midpoint the pointer finished above — insert before
    // it. Past every midpoint (idx -1) means "insert at the end".
    const idx = info.rows.findIndex((r) => e.clientY < r.mid);
    const to = idx === -1 ? info.rows.length : idx;
    const from = ids.indexOf(info.id);
    if (from === -1) return;

    const next = ids.slice();
    next.splice(from, 1);
    // `to` was computed against the pre-removal row order — removing `from`
    // first shifts every later index back by one.
    const insertAt = to > from ? to - 1 : to;
    if (insertAt === from) return; // dropped back where it started
    next.splice(insertAt, 0, info.id);
    onDrop(next);
  }

  return { draggingId, offsetY, registerRow, handlePointerDown, handlePointerMove, handlePointerUp };
}
