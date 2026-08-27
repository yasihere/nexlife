import { useState } from 'react';
import { create, drop, update } from '../data/entries';
import { hapticTick } from '../lib/native';
import { todayKey } from '../lib/time';
import type { Entry, GoalPeriod } from '../data/types';

interface GoalFormProps {
  /** undefined = creating a new goal. */
  entry?: Entry;
  onClose: () => void;
}

const PERIODS: GoalPeriod[] = ['week', 'month', 'year', 'longterm', 'lifetime'];
const PERIOD_LABEL: Record<GoalPeriod, string> = {
  week: 'This week',
  month: 'This month',
  year: 'This year',
  longterm: 'Long-term',
  lifetime: 'Lifetime',
};

/**
 * One form for both creating and editing — a goal's fields (title, timescale,
 * target, progress, unit) don't grow the way a task's do (no recurrence, no
 * subtasks: v1's explicit scope, see types.ts's GoalPeriod comment), so unlike
 * EntrySheet this doesn't need a separate read-only vs. editable split.
 */
export default function GoalForm({ entry, onClose }: GoalFormProps) {
  const [title, setTitle] = useState(entry?.title ?? '');
  const [period, setPeriod] = useState<GoalPeriod>(entry?.period ?? 'month');
  const [target, setTarget] = useState(entry?.target !== undefined ? String(entry.target) : '');
  const [progress, setProgress] = useState(String(entry?.progress ?? 0));
  const [unit, setUnit] = useState(entry?.unit ?? '');

  const targetNum = parseFloat(target);
  const canSave = title.trim().length > 0 && !Number.isNaN(targetNum) && targetNum > 0;

  async function handleSave(): Promise<void> {
    if (!canSave) return;
    const progressNum = Math.max(0, parseFloat(progress) || 0);
    const fields = {
      title: title.trim(),
      period,
      target: targetNum,
      progress: progressNum,
      unit: unit.trim() || undefined,
    };
    if (entry) {
      await update(entry.id, fields);
    } else {
      await create({ type: 'goal', dayKey: todayKey(), tags: [], priority: 0, ...fields });
    }
    void hapticTick();
    onClose();
  }

  async function handleDrop(): Promise<void> {
    if (!entry) return;
    await drop(entry.id);
    void hapticTick();
    onClose();
  }

  return (
    <div className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto p-4">
      <h2 className="text-heading text-paper">{entry ? 'Edit goal' : 'New goal'}</h2>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Read 12 books"
        className="min-h-[44px] rounded border border-rule bg-void px-3 text-title text-paper placeholder:text-muted"
      />

      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Timescale</span>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={
                'min-h-[44px] rounded border px-3 text-[11px] font-semibold uppercase tracking-[0.08em] ' +
                (period === p ? 'border-paper text-paper' : 'border-rule text-muted')
              }
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex flex-1 flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Target</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="12"
            className="tabular-nums min-h-[44px] w-full rounded border border-rule bg-void px-2 text-title text-paper placeholder:text-muted"
          />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Progress</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={progress}
            onChange={(e) => setProgress(e.target.value)}
            className="tabular-nums min-h-[44px] w-full rounded border border-rule bg-void px-2 text-title text-paper"
          />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Unit</span>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="books"
            className="min-h-[44px] w-full rounded border border-rule bg-void px-2 text-title text-paper placeholder:text-muted"
          />
        </div>
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
        <button type="button" onClick={() => void handleDrop()} className="min-h-[44px] text-title text-muted">
          Drop
        </button>
      )}
    </div>
  );
}
