interface NowLineProps {
  /** Vertical offset from the top of the time grid, in px. */
  top: number;
  /** Where the hour gutter ends and the line/dot begin, in px. */
  gutter: number;
  /** Pre-formatted tabular time, e.g. "9:41 AM". */
  label: string;
}

/**
 * The signature element (CLAUDE.md §5). The one place besides overdue items
 * and a sheet's primary action that `--signal` appears. In Phase 3 this
 * position is recomputed once a minute from one shared interval — for this
 * shell it is drawn once, at mount time.
 */
export default function NowLine({ top, gutter, label }: NowLineProps) {
  return (
    <div className="absolute inset-x-0 z-10" style={{ top }}>
      <span
        className="tabular-nums absolute top-[-6px] whitespace-nowrap text-right text-[11px] font-semibold text-signal"
        style={{ left: 0, width: gutter - 8 }}
      >
        {label}
      </span>
      <div className="absolute h-px bg-signal" style={{ left: gutter, right: 0 }} />
      <span
        className="absolute block h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal"
        style={{ left: gutter }}
      />
    </div>
  );
}
