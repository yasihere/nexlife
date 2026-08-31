import { useState } from 'react';
import { softDelete, update } from '../data/entries';
import { hapticTick } from '../lib/native';
import type { Entry } from '../data/types';

interface LogFormProps {
  entry: Entry;
  onClose: () => void;
}

const UNIT_HINT: Record<string, string> = {
  INR: '₹',
  kg: 'kg',
  steps: 'steps',
  ml: 'ml',
  hrs: 'hrs',
};

/**
 * Editing a logged entry (money/health) — title, amount, date and tags. Unit
 * stays fixed: it's what makes the entry belong to its section (Money, Weight,
 * ...) in the first place, and there's no meaningful conversion between them.
 * Replaces Log.tsx's old tap-to-delete-only behaviour — that's still here
 * (Delete, below), just no longer the only thing a tap can do.
 */
export default function LogForm({ entry, onClose }: LogFormProps) {
  const [title, setTitle] = useState(entry.title);
  const [amount, setAmount] = useState(entry.amount != null ? String(entry.amount) : '');
  const [dayKey, setDayKey] = useState(entry.dayKey ?? '');
  const [tags, setTags] = useState<string[]>(entry.tags);
  const [tagDraft, setTagDraft] = useState('');

  const amountNum = parseFloat(amount);
  const canSave = !Number.isNaN(amountNum) && amountNum > 0 && !!dayKey;

  function addTag(): void {
    const t = tagDraft.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagDraft('');
  }

  async function handleSave(): Promise<void> {
    if (!canSave) return;
    await update(entry.id, { title: title.trim(), amount: amountNum, dayKey, tags });
    void hapticTick();
    onClose();
  }

  async function handleDelete(): Promise<void> {
    await softDelete(entry.id);
    void hapticTick();
    onClose();
  }

  return (
    <div className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto p-4">
      <h2 className="text-heading text-paper">Edit {entry.unit === 'INR' ? 'expense' : 'log'}</h2>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Description</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="groceries"
          className="min-h-[44px] rounded border border-rule bg-void px-3 text-title text-paper placeholder:text-muted"
        />
      </div>

      <div className="flex gap-2">
        <div className="flex flex-1 flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            Amount{entry.unit ? ` (${UNIT_HINT[entry.unit] ?? entry.unit})` : ''}
          </span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="tabular-nums min-h-[44px] w-full rounded border border-rule bg-void px-3 text-title text-paper"
          />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Date</span>
          <input
            type="date"
            value={dayKey}
            onChange={(e) => setDayKey(e.target.value)}
            className="tabular-nums min-h-[44px] w-full rounded border border-rule bg-void px-3 text-title text-paper"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Tags</span>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setTags(tags.filter((t) => t !== tag))}
              aria-label={`Remove tag ${tag}`}
              className="rounded border border-rule px-2 py-1 text-[11px] uppercase tracking-[0.08em] text-muted"
            >
              #{tag} ×
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Add a tag"
            className="min-h-[44px] flex-1 rounded border border-rule bg-void px-3 text-title text-paper placeholder:text-muted"
          />
          <button
            type="button"
            onClick={addTag}
            className="min-h-[44px] rounded border border-rule px-4 text-title text-paper"
          >
            Add
          </button>
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

      <button type="button" onClick={() => void handleDelete()} className="min-h-[44px] text-title text-muted">
        Delete
      </button>
    </div>
  );
}
