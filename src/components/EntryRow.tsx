import { useLongPress } from './useLongPress';

interface EntryRowProps {
  title: string;
  time: string;
  top: number;
  height: number;
  /** CSS left, as a calc() string so overlapping entries can share the row (src/lib/layout.ts). */
  left: string;
  /** CSS width, as a calc() string — see `left`. */
  width: string;
  onToggleComplete: () => void;
  /** Long-press opens the edit sheet — tap stays the fast complete path. */
  onOpen: () => void;
  /** Done items lose colour, not gain it — CLAUDE.md §5: "removal, not colour". */
  completed?: boolean;
  /** Incomplete and scheduled before the Now Line — the one other use of `--signal`. */
  overdue?: boolean;
  priority?: 0 | 1 | 2 | 3;
  /** "2/5" — set when this entry has subtasks. */
  childProgress?: { done: number; total: number };
}

/**
 * Priority as weight, never colour (CLAUDE.md §5: "never a red badge") — a
 * thicker, progressively more prominent neutral rule. Overdue's `--signal`
 * border always wins when both apply: time pressure is the one thing that
 * gets the app's one accent colour.
 */
export function priorityBorder(priority: 0 | 1 | 2 | 3): string {
  switch (priority) {
    case 1:
      return '1px solid var(--rule)';
    case 2:
      return '2px solid var(--muted)';
    case 3:
      return '3px solid var(--paper)';
    default:
      return '2px solid transparent';
  }
}

export default function EntryRow({
  title,
  time,
  top,
  height,
  left,
  width,
  onToggleComplete,
  onOpen,
  completed = false,
  overdue = false,
  priority = 0,
  childProgress,
}: EntryRowProps) {
  const press = useLongPress(onToggleComplete, onOpen);

  return (
    <button
      type="button"
      {...press}
      className="absolute flex flex-col justify-center overflow-hidden rounded bg-panel pl-3 pr-2 text-left transition-opacity duration-[120ms]"
      style={{
        top,
        height,
        left,
        width,
        paddingTop: completed ? 4 : 8,
        paddingBottom: completed ? 4 : 8,
        opacity: completed ? 0.35 : 1,
        borderLeft: overdue && !completed ? '2px solid var(--signal)' : priorityBorder(priority),
      }}
    >
      <span className="tabular-nums text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        {time}
      </span>
      <span
        className="flex w-full items-baseline gap-1.5"
        style={{ textDecoration: completed ? 'line-through' : 'none' }}
      >
        <span className="min-w-0 truncate text-title text-paper">{title}</span>
        {childProgress && (
          <span className="tabular-nums shrink-0 text-[11px] text-muted">
            {childProgress.done}/{childProgress.total}
          </span>
        )}
      </span>
    </button>
  );
}
