import { useEffect, useRef, useState, type FormEvent } from 'react';
import { create } from '../data/entries';
import { parseQuickAdd, type ParsedQuickAdd } from '../data/parse';
import QuickAddPreview from './QuickAddPreview';

interface QuickAddProps {
  onClose: () => void;
}

const DEBOUNCE_MS = 200;

/**
 * One-line natural-language quick add (PROMPTS.md Phase 5). Fully replaces the
 * Phase 3 structured form — that was explicitly a placeholder ("natural
 * language is Phase 5", PROMPTS.md Phase 3).
 */
export default function QuickAdd({ onClose }: QuickAddProps) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<ParsedQuickAdd | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (!text.trim()) {
      setPreview(null);
      return;
    }
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      void parseQuickAdd(text).then((result) => {
        if (id === requestId.current) setPreview(result);
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    // Re-parse rather than trust `preview` — if Add is tapped faster than the
    // debounce window, `preview` can still be one keystroke stale.
    const result = await parseQuickAdd(text);

    if (result.type === 'log') {
      // A log is a timestamped number with a unit (PROMPTS.md Phase 10) — no
      // priority/energy/estimate, those don't mean anything for a log.
      await create({
        type: 'log',
        title: result.title,
        tags: result.tags,
        priority: 0,
        amount: result.amount,
        unit: result.unit,
        dayKey: result.dayKey,
      });
    } else {
      await create({
        type: 'task',
        title: result.title || trimmed,
        tags: result.tags,
        priority: result.priority,
        estimateMin: result.estimateMin,
        energy: result.energy,
        dayKey: result.dayKey,
        startMin: result.startMin,
      });
    }
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
      <h2 className="text-heading text-paper">Add task</h2>

      <QuickAddPreview parsed={preview} rawInput={text} />

      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="pay rent friday 5pm #money !high ~30m"
        className="min-h-[44px] rounded border border-rule bg-void px-3 text-title text-paper placeholder:text-muted"
      />

      <button
        type="submit"
        disabled={!text.trim()}
        className="min-h-[44px] rounded bg-signal text-title font-medium text-void disabled:opacity-40"
      >
        Add
      </button>
    </form>
  );
}
