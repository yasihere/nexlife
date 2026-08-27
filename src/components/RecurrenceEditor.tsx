export interface RepeatDraft {
  kind: 'daily' | 'weekly' | 'monthly';
  every: number;
  weekdays: number[];
  dayOfMonth: number;
}

export const DEFAULT_REPEAT_DRAFT: RepeatDraft = {
  kind: 'weekly',
  every: 1,
  weekdays: [],
  dayOfMonth: 1,
};

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface RecurrenceEditorProps {
  value: RepeatDraft | null;
  onChange: (draft: RepeatDraft | null) => void;
}

/**
 * Sets up a NEW repeat only — editing an existing series' cadence is out of
 * scope for this phase (see chat: which entry would own the changed rule, and
 * what happens to already-materialised rows, are real design questions this
 * doesn't answer yet). Once a task is recurring, this stays hidden and
 * EntrySheet shows a plain read-only summary instead.
 */
export default function RecurrenceEditor({ value, onChange }: RecurrenceEditorProps) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => onChange(value ? null : DEFAULT_REPEAT_DRAFT)}
        className={
          'min-h-[44px] rounded border px-3 text-left text-title ' +
          (value ? 'border-paper text-paper' : 'border-rule text-muted')
        }
      >
        Repeat
      </button>

      {value && (
        <div className="flex flex-col gap-2 rounded border border-rule p-3">
          <div className="flex gap-2">
            {(['daily', 'weekly', 'monthly'] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => onChange({ ...value, kind })}
                className={
                  'min-h-[44px] flex-1 rounded border text-[11px] font-semibold uppercase tracking-[0.08em] ' +
                  (value.kind === kind ? 'border-paper text-paper' : 'border-rule text-muted')
                }
              >
                {kind}
              </button>
            ))}
          </div>

          <label className="flex items-center justify-between">
            <span className="text-title text-muted">Every</span>
            <span className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={value.every}
                onChange={(e) => onChange({ ...value, every: Math.max(1, Number(e.target.value) || 1) })}
                className="tabular-nums min-h-[44px] w-16 rounded border border-rule bg-void px-2 text-title text-paper"
              />
              <span className="text-title text-muted">
                {value.kind === 'daily' ? 'day(s)' : value.kind === 'weekly' ? 'week(s)' : 'month(s)'}
              </span>
            </span>
          </label>

          {value.kind === 'weekly' && (
            <div className="flex gap-1">
              {WEEKDAY_LABELS.map((label, day) => {
                const active = value.weekdays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...value,
                        weekdays: active
                          ? value.weekdays.filter((d) => d !== day)
                          : [...value.weekdays, day].sort(),
                      })
                    }
                    className={
                      'flex h-[44px] flex-1 items-center justify-center rounded border text-[11px] font-semibold ' +
                      (active ? 'border-paper text-paper' : 'border-rule text-muted')
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {value.kind === 'monthly' && (
            <label className="flex items-center justify-between">
              <span className="text-title text-muted">Day of month</span>
              <input
                type="number"
                min={1}
                max={31}
                value={value.dayOfMonth}
                onChange={(e) =>
                  onChange({ ...value, dayOfMonth: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })
                }
                className="tabular-nums min-h-[44px] w-16 rounded border border-rule bg-void px-2 text-title text-paper"
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
