import { useState } from 'react';
import { create, softDelete, update } from '../data/entries';
import { hapticTick } from '../lib/native';
import { todayKey } from '../lib/time';
import type { Entry } from '../data/types';

interface BudgetFormProps {
  /** undefined = creating a new budget. */
  entry?: Entry;
  /** Every #tag already used on a money log — offered as quick picks so
   *  a budget's tag always lines up with the tags money-by-tag already
   *  shows, rather than inventing a near-duplicate spelling. */
  knownTags: string[];
  /** Every other active budget, for the duplicate-tag check below. Excludes
   *  `entry` itself so editing a budget without changing its tag doesn't
   *  flag against itself. */
  otherBudgets: Entry[];
  onClose: () => void;
}

/**
 * One form for both creating and editing a budget — same shape as GoalForm.
 * A budget has exactly two real fields (tag, monthly cap): no timescale
 * picker, no progress input — "spent so far" is never typed in, it's always
 * read live off the logs (src/lib/budgetAggregation.ts).
 */
export default function BudgetForm({ entry, knownTags, otherBudgets, onClose }: BudgetFormProps) {
  const [tag, setTag] = useState(entry?.tags[0] ?? '');
  const [cap, setCap] = useState(entry?.target !== undefined ? String(entry.target) : '');

  // Tags themselves only ever contain [a-zA-Z0-9_-] (parse.ts's TAG_RE) — a
  // budget's tag has to match that exactly or it can never line up with a
  // real log, silently capping nothing forever. Strip anything else as you
  // type rather than let that typo through.
  const cleanTag = tag
    .trim()
    .replace(/^#/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '');
  const capNum = parseFloat(cap);
  const canSave = cleanTag.length > 0 && !Number.isNaN(capNum) && capNum > 0;
  const duplicate = otherBudgets.find((b) => b.tags[0] === cleanTag);

  async function handleSave(): Promise<void> {
    if (!canSave) return;
    const fields = { tags: [cleanTag], target: capNum, unit: 'INR' };
    if (entry) {
      await update(entry.id, fields);
    } else if (duplicate) {
      // Two budgets on one tag would just show two confusing rows computing
      // the same spend against different caps — editing the existing one is
      // what the user means by "set a budget for a tag that already has one."
      await update(duplicate.id, fields);
    } else {
      await create({ type: 'budget', title: `#${cleanTag} budget`, dayKey: todayKey(), priority: 0, ...fields });
    }
    void hapticTick();
    onClose();
  }

  async function handleDelete(): Promise<void> {
    if (!entry) return;
    await softDelete(entry.id);
    void hapticTick();
    onClose();
  }

  return (
    <div className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto p-4">
      <h2 className="text-heading text-paper">{entry ? 'Edit budget' : 'New budget'}</h2>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Tag</span>
        <input
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="food"
          className="min-h-[44px] rounded border border-rule bg-void px-3 text-title text-paper placeholder:text-muted"
        />
        {knownTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {knownTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTag(t)}
                className={
                  'min-h-[44px] rounded border px-3 text-[11px] font-semibold uppercase tracking-[0.08em] ' +
                  (cleanTag === t ? 'border-paper text-paper' : 'border-rule text-muted')
                }
              >
                #{t}
              </button>
            ))}
          </div>
        )}
        {!entry && duplicate && (
          <p className="text-title text-muted">A budget for #{cleanTag} already exists — saving updates it.</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Monthly cap (₹)</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          value={cap}
          onChange={(e) => setCap(e.target.value)}
          placeholder="5000"
          className="tabular-nums min-h-[44px] w-full rounded border border-rule bg-void px-3 text-title text-paper placeholder:text-muted"
        />
      </div>

      <button
        type="button"
        disabled={!canSave}
        onClick={() => void handleSave()}
        className="min-h-[44px] rounded bg-signal text-title font-medium text-void disabled:opacity-40"
      >
        Save
      </button>

      {entry && (
        <button type="button" onClick={() => void handleDelete()} className="min-h-[44px] text-title text-muted">
          Delete
        </button>
      )}
    </div>
  );
}
