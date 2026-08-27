import type { Entry } from '../data/types';

interface GoalRowProps {
  entry: Entry;
  onOpen: () => void;
}

/**
 * "Completion by removal, not colour" (CLAUDE.md §5) applies here exactly like
 * a task row: an achieved goal (progress >= target) dims and strikes through
 * rather than turning green or gaining a badge. The thin fill bar reuses the
 * same 1px hairline the Today header's progress rule already uses — no new
 * visual language for "how far along."
 */
export default function GoalRow({ entry, onOpen }: GoalRowProps) {
  const target = entry.target ?? 0;
  const progress = entry.progress ?? 0;
  const achieved = target > 0 && progress >= target;
  const pct = target > 0 ? Math.min(1, progress / target) : 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-[44px] w-full flex-col gap-1.5 rounded bg-panel px-3 py-2 text-left"
      style={{ opacity: achieved ? 0.35 : 1 }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          className="min-w-0 truncate text-title text-paper"
          style={{ textDecoration: achieved ? 'line-through' : 'none' }}
        >
          {entry.title}
        </span>
        <span className="tabular-nums shrink-0 text-title text-muted">
          {progress}
          {target > 0 ? `/${target}` : ''}
          {entry.unit ? ` ${entry.unit}` : ''}
        </span>
      </div>
      {target > 0 && (
        <div className="h-px w-full bg-rule">
          <div className="h-px bg-paper/60" style={{ width: `${pct * 100}%` }} />
        </div>
      )}
    </button>
  );
}
