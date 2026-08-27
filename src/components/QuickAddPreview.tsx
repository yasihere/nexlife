import { format, parseISO } from 'date-fns';
import type { ReactNode } from 'react';
import type { ParsedQuickAdd } from '../data/parse';
import { formatLogAmount } from '../lib/logAggregation';

interface QuickAddPreviewProps {
  parsed: ParsedQuickAdd | null;
  rawInput: string;
}

const PRIORITY_LABEL = ['', 'Low', 'Med', 'High'] as const;

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-rule px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
      {children}
    </span>
  );
}

/** "I see it before I confirm" (PROMPTS.md Phase 5, #2) — every field the
 *  parser found, rendered as neutral chips above the input as the user types. */
export default function QuickAddPreview({ parsed, rawInput }: QuickAddPreviewProps) {
  if (!rawInput.trim()) return null;

  // Debounce window between a keystroke and the (async, chrono-backed) parse
  // resolving — a placeholder chip, not a blank gap, so the preview never looks
  // like it silently dropped what was just typed.
  if (!parsed) {
    return (
      <div className="flex flex-wrap gap-2">
        <Chip>…</Chip>
      </div>
    );
  }

  if (parsed.type === 'log') {
    return (
      <div className="flex flex-wrap gap-2">
        <Chip>{formatLogAmount(parsed.unit!, parsed.amount!)}</Chip>
        {parsed.title && <Chip>{parsed.title}</Chip>}
        {parsed.tags.map((tag) => (
          <Chip key={tag}>#{tag}</Chip>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Chip>{parsed.title || '(no title)'}</Chip>
      {parsed.dayKey && <Chip>{format(parseISO(parsed.dayKey), 'EEE, MMM d')}</Chip>}
      {parsed.startMin != null && (
        <Chip>{format(new Date(0, 0, 0, 0, parsed.startMin), 'h:mm a')}</Chip>
      )}
      {parsed.estimateMin != null && <Chip>{parsed.estimateMin}m</Chip>}
      {parsed.energy && <Chip>{parsed.energy} energy</Chip>}
      {parsed.priority > 0 && <Chip>{PRIORITY_LABEL[parsed.priority]} priority</Chip>}
      {parsed.tags.map((tag) => (
        <Chip key={tag}>#{tag}</Chip>
      ))}
      {parsed.dateHint && <Chip>? {parsed.dateHint}</Chip>}
    </div>
  );
}
