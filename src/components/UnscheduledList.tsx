import { priorityBorder } from './EntryRow';
import { useLongPress } from './useLongPress';
import VirtualList from './VirtualList';
import type { Entry } from '../data/types';

const VIRTUALIZE_THRESHOLD = 100; // PROMPTS.md Phase 8, #2
const ROW_HEIGHT = 52; // 44px row + the list's 8px gap

interface UnscheduledRowProps {
  entry: Entry;
  childProgress?: { done: number; total: number };
  onToggleComplete: () => void;
  onOpen: () => void;
}

function UnscheduledRow({ entry, childProgress, onToggleComplete, onOpen }: UnscheduledRowProps) {
  const press = useLongPress(onToggleComplete, onOpen);
  return (
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
  );
}

interface UnscheduledListProps {
  entries: Entry[];
  childSummaries: Map<string, { done: number; total: number }>;
  onToggleComplete: (entry: Entry) => void;
  onOpen: (entry: Entry) => void;
}

/** Today's "Unscheduled" section — entries with no startMin (PROMPTS.md Phase 3). */
export default function UnscheduledList({
  entries,
  childSummaries,
  onToggleComplete,
  onOpen,
}: UnscheduledListProps) {
  if (entries.length === 0) return null;

  const row = (entry: Entry) => (
    <UnscheduledRow
      entry={entry}
      childProgress={childSummaries.get(entry.id)}
      onToggleComplete={() => onToggleComplete(entry)}
      onOpen={() => onOpen(entry)}
    />
  );

  return (
    <div className="mb-4 mt-2 border-t border-rule pt-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Unscheduled</h2>
      {entries.length > VIRTUALIZE_THRESHOLD ? (
        <div className="mt-2">
          <VirtualList items={entries} itemHeight={ROW_HEIGHT} getKey={(e) => e.id} renderItem={row} />
        </div>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.id}>{row(entry)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
