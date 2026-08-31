import type { PointerEvent } from 'react';
import { priorityBorder } from './EntryRow';
import { useLongPress } from './useLongPress';
import { useDragReorder } from './useDragReorder';
import DragHandle from './DragHandle';
import VirtualList from './VirtualList';
import type { Entry } from '../data/types';

const VIRTUALIZE_THRESHOLD = 100; // PROMPTS.md Phase 8, #2
const ROW_HEIGHT = 52; // 44px row + the list's 8px gap

interface UnscheduledRowProps {
  entry: Entry;
  childProgress?: { done: number; total: number };
  onToggleComplete: () => void;
  onOpen: () => void;
  dragHandle?: {
    dragging: boolean;
    offsetY: number;
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => void;
    onPointerMove: (e: PointerEvent<HTMLButtonElement>) => void;
    onPointerUp: (e: PointerEvent<HTMLButtonElement>) => void;
  };
}

function UnscheduledRow({ entry, childProgress, onToggleComplete, onOpen, dragHandle }: UnscheduledRowProps) {
  const press = useLongPress(onToggleComplete, onOpen);
  return (
    <div
      className="flex items-center gap-1"
      style={
        dragHandle?.dragging
          ? { transform: `translateY(${dragHandle.offsetY}px)`, position: 'relative', zIndex: 10 }
          : undefined
      }
    >
      <button
        type="button"
        {...press}
        className="flex min-h-[44px] w-full min-w-0 items-center rounded bg-panel px-3 text-left transition-opacity duration-[120ms]"
        style={{ opacity: entry.completedAt ? 0.35 : 1, borderLeft: priorityBorder(entry.priority) }}
      >
        <span className="flex w-full min-w-0 items-baseline gap-1.5">
          <span
            className="min-w-0 truncate text-title text-paper"
            style={{ textDecoration: entry.completedAt ? 'line-through' : 'none' }}
          >
            {entry.title}
          </span>
          {childProgress && (
            <span className="tabular-nums shrink-0 text-[11px] text-muted">
              {childProgress.done}/{childProgress.total}
            </span>
          )}
        </span>
      </button>
      {dragHandle && (
        <DragHandle
          onPointerDown={dragHandle.onPointerDown}
          onPointerMove={dragHandle.onPointerMove}
          onPointerUp={dragHandle.onPointerUp}
        />
      )}
    </div>
  );
}

interface UnscheduledListProps {
  entries: Entry[];
  childSummaries: Map<string, { done: number; total: number }>;
  onToggleComplete: (entry: Entry) => void;
  onOpen: (entry: Entry) => void;
  onReorder: (orderedIds: string[]) => void;
}

/** Today's "Unscheduled" section — entries with no startMin (PROMPTS.md Phase 3).
 *  Manually reorderable via a drag handle (useDragReorder.ts) below the
 *  virtualize threshold — a virtualized list only has DOM for its visible
 *  rows, which the drag measurement needs for every row up front. */
export default function UnscheduledList({
  entries,
  childSummaries,
  onToggleComplete,
  onOpen,
  onReorder,
}: UnscheduledListProps) {
  const draggable = entries.length <= VIRTUALIZE_THRESHOLD;
  const { draggingId, offsetY, registerRow, handlePointerDown, handlePointerMove, handlePointerUp } =
    useDragReorder({ ids: entries.map((e) => e.id), onDrop: onReorder });

  if (entries.length === 0) return null;

  const row = (entry: Entry) => (
    <UnscheduledRow
      entry={entry}
      childProgress={childSummaries.get(entry.id)}
      onToggleComplete={() => onToggleComplete(entry)}
      onOpen={() => onOpen(entry)}
      dragHandle={
        draggable
          ? {
              dragging: draggingId === entry.id,
              offsetY,
              onPointerDown: (e) => handlePointerDown(entry.id, e),
              onPointerMove: handlePointerMove,
              onPointerUp: handlePointerUp,
            }
          : undefined
      }
    />
  );

  return (
    <div className="mb-4 mt-2 border-t border-rule pt-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Unscheduled</h2>
      {!draggable ? (
        <div className="mt-2">
          <VirtualList items={entries} itemHeight={ROW_HEIGHT} getKey={(e) => e.id} renderItem={row} />
        </div>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.id} ref={(el) => registerRow(entry.id, el)}>
              {row(entry)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
