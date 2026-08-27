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
  /** Done items lose colour, not gain it — CLAUDE.md §5: "removal, not colour". */
  completed?: boolean;
  /** Incomplete and scheduled before the Now Line — the one other use of `--signal`. */
  overdue?: boolean;
}

export default function EntryRow({
  title,
  time,
  top,
  height,
  left,
  width,
  onToggleComplete,
  completed = false,
  overdue = false,
}: EntryRowProps) {
  return (
    <button
      type="button"
      onClick={onToggleComplete}
      className="absolute flex flex-col justify-center overflow-hidden rounded bg-panel pl-3 pr-2 text-left transition-opacity duration-[120ms]"
      style={{
        top,
        height,
        left,
        width,
        paddingTop: completed ? 4 : 8,
        paddingBottom: completed ? 4 : 8,
        opacity: completed ? 0.35 : 1,
        borderLeft: overdue && !completed ? '2px solid var(--signal)' : '2px solid transparent',
      }}
    >
      <span className="tabular-nums text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        {time}
      </span>
      <span
        className="block w-full truncate text-title text-paper"
        style={{ textDecoration: completed ? 'line-through' : 'none' }}
      >
        {title}
      </span>
    </button>
  );
}
