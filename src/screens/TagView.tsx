import { useSyncExternalStore } from 'react';
import { format, parseISO } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import { getByTag } from '../data/queries';
import { getActiveTag, subscribeActiveTag } from '../lib/tagIntent';
import { pop } from '../lib/nav';
import EmptyState from '../components/EmptyState';
import type { Entry } from '../data/types';

const TYPE_LABEL: Record<Entry['type'], string> = {
  task: 'Task',
  habit: 'Habit',
  log: 'Log',
  note: 'Note',
  goal: 'Goal',
  budget: 'Budget',
};

function whenLabel(entry: Entry): string {
  const date = entry.dayKey ? parseISO(entry.dayKey) : new Date(entry.createdAt);
  return format(date, 'MMM d');
}

function back(): void {
  pop();
}

/**
 * Every saved entry carrying one #tag, reached by tapping a TagChip anywhere
 * in the app. Read-only summaries across all six entry types — same "deep-
 * linking to a type's own edit UI is out of scope" call Notes.tsx's mixed-
 * type search results already made; each type has its own edit affordance
 * (EntrySheet, NoteCard, BudgetForm...) that a generic list here shouldn't
 * try to reproduce.
 */
export default function TagView() {
  const tag = useSyncExternalStore(subscribeActiveTag, getActiveTag);
  const entries = useLiveQuery(() => (tag ? getByTag(tag) : Promise.resolve([])), [tag]) ?? [];

  // Only reachable if this screen were somehow opened without a TagChip tap
  // setting the tag first — defensive, not an expected path.
  if (!tag) {
    return (
      <div className="mx-auto flex h-dvh max-w-[430px] flex-col bg-void">
        <EmptyState message="No tag selected." actionLabel="Back" onAction={back} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-dvh max-w-[430px] flex-col bg-void">
      <header className="px-4 pt-[max(16px,env(safe-area-inset-top))]">
        <button type="button" onClick={back} className="min-h-[44px] text-title text-muted">
          Back
        </button>
        <h1 className="text-heading text-paper">#{tag}</h1>
        <p className="pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          {entries.length} saved
        </p>
      </header>

      {entries.length === 0 ? (
        <EmptyState message={`Nothing tagged #${tag} anymore.`} actionLabel="Back" onAction={back} />
      ) : (
        <ul className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 pb-4">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex min-h-[44px] items-center justify-between gap-2 rounded bg-panel px-3 py-2"
              style={{ opacity: entry.completedAt ? 0.35 : 1 }}
            >
              <span className="flex min-w-0 flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                  {TYPE_LABEL[entry.type]}
                </span>
                <span
                  className="min-w-0 truncate text-title text-paper"
                  style={{ textDecoration: entry.completedAt ? 'line-through' : 'none' }}
                >
                  {entry.title || (entry.type === 'note' ? 'Empty note' : entry.type)}
                </span>
              </span>
              <span className="tabular-nums shrink-0 text-[11px] text-muted">{whenLabel(entry)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
