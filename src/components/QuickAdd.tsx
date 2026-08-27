import { useState, type FormEvent } from 'react';
import { create } from '../data/entries';
import { todayKey, addDays } from '../lib/time';

interface QuickAddProps {
  onClose: () => void;
}

/**
 * Tap-based quick add — title, today/tomorrow, optional time. Natural-language
 * parsing is Phase 5; this is the plain form it falls back to.
 */
export default function QuickAdd({ onClose }: QuickAddProps) {
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState<'today' | 'tomorrow'>('today');
  const [time, setTime] = useState('');

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    const dayKey = when === 'today' ? todayKey() : addDays(todayKey(), 1);
    let startMin: number | undefined;
    if (time) {
      const [h, m] = time.split(':').map(Number);
      startMin = h * 60 + m;
    }

    await create({ type: 'task', title: trimmed, dayKey, startMin });
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <h2 className="text-heading text-paper">Add task</h2>

      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What are you doing?"
        className="min-h-[44px] rounded border border-rule bg-void px-3 text-title text-paper placeholder:text-muted"
      />

      <div className="flex gap-2">
        {(['today', 'tomorrow'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setWhen(option)}
            aria-pressed={when === option}
            className={
              'min-h-[44px] flex-1 rounded border text-title capitalize ' +
              (when === option ? 'border-paper text-paper' : 'border-rule text-muted')
            }
          >
            {option}
          </button>
        ))}
      </div>

      <label className="flex items-center justify-between gap-3">
        <span className="text-title text-muted">Time (optional)</span>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="tabular-nums min-h-[44px] rounded border border-rule bg-void px-3 text-title text-paper"
        />
      </label>

      <button
        type="submit"
        disabled={!title.trim()}
        className="min-h-[44px] rounded bg-signal text-title font-medium text-void disabled:opacity-40"
      >
        Add
      </button>
    </form>
  );
}
