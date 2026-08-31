import { formatLogAmount } from '../lib/logAggregation';
import type { BudgetStatus } from '../lib/budgetAggregation';

interface BudgetRowProps {
  status: BudgetStatus;
  onOpen: () => void;
}

/**
 * Spent-vs-cap bar, same thin-hairline language as GoalRow's progress bar —
 * no new visual vocabulary for "how far along." The one difference: this bar
 * can turn --signal, because overspending is this app's other form of time
 * pressure (CLAUDE.md §5 reserves --signal for exactly that). A projection
 * line only appears once budgetAggregation.ts considers it meaningful.
 */
export default function BudgetRow({ status, onOpen }: BudgetRowProps) {
  const { tag, cap, spent, projected, pctOfCap, overCap, overPace } = status;
  const barPct = Math.min(1, pctOfCap);

  let footer: string | null = null;
  if (overCap) footer = 'Over cap';
  else if (projected !== null) {
    footer = `${overPace ? 'On pace to go over: ' : 'Projected: '}${formatLogAmount('INR', projected)} by month end`;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-[44px] w-full flex-col gap-1.5 rounded bg-panel px-3 py-2 text-left"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-title text-paper">#{tag}</span>
        <span className="tabular-nums shrink-0 text-title">
          <span style={{ color: overCap ? 'var(--signal)' : 'var(--paper)' }}>{formatLogAmount('INR', spent)}</span>
          <span className="text-muted"> / {formatLogAmount('INR', cap)}</span>
        </span>
      </div>

      <div className="h-px w-full bg-rule">
        <div
          className="h-px"
          style={{ width: `${barPct * 100}%`, backgroundColor: overCap ? 'var(--signal)' : 'var(--paper)' }}
        />
      </div>

      {footer && (
        <span className="text-title" style={{ color: overCap || overPace ? 'var(--signal)' : 'var(--muted)' }}>
          {footer}
        </span>
      )}
    </button>
  );
}
