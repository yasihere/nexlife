interface EntryRowProps {
  title: string;
  time: string;
  top: number;
  height: number;
  left: number;
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
  completed = false,
  overdue = false,
}: EntryRowProps) {
  return (
    <div
      className="absolute right-2 flex flex-col justify-center overflow-hidden rounded bg-panel pl-3 pr-2"
      style={{
        top,
        height,
        left,
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
        className="text-title text-paper"
        style={{ textDecoration: completed ? 'line-through' : 'none' }}
      >
        {title}
      </span>
    </div>
  );
}
