import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getSearchableEntries, getStandaloneNotes } from '../data/queries';
import { create } from '../data/entries';
import { buildSearchIndex, searchIndex } from '../lib/searchIndex';
import NoteCard from '../components/NoteCard';
import BottomNav from '../components/BottomNav';
import EmptyState from '../components/EmptyState';
import type { Entry } from '../data/types';

const TYPE_LABEL: Record<Entry['type'], string> = {
  task: 'Task',
  habit: 'Habit',
  log: 'Log',
  note: 'Note',
};

/**
 * Standalone notes by default; typing searches every type by title/body/tags
 * (PROMPTS.md Phase 11). Non-note results are read-only summaries here —
 * deep-linking to a task's own screen is out of scope for a "minimal" search.
 */
export default function Notes() {
  const [query, setQuery] = useState('');
  const allEntries = useLiveQuery(() => getSearchableEntries()) ?? [];
  const standaloneNotes = useLiveQuery(() => getStandaloneNotes()) ?? [];

  // Rebuilds only when the underlying data actually changes (useLiveQuery
  // gives a new array reference), not on every keystroke — see searchIndex.ts.
  const index = useMemo(() => buildSearchIndex(allEntries), [allEntries]);
  const results = useMemo(
    () => (query.trim() ? searchIndex(index, query) : null),
    [index, query]
  );

  async function handleNewNote(): Promise<void> {
    await create({ type: 'note', title: 'Note', body: '', tags: [] });
  }

  const showing = results ?? standaloneNotes;

  return (
    <div className="mx-auto flex h-dvh max-w-[430px] flex-col bg-void">
      <header className="px-4 pb-3 pt-[max(16px,env(safe-area-inset-top))]">
        <h1 className="text-heading text-paper">Notes</h1>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search everything"
          className="mt-2 min-h-[44px] w-full rounded border border-rule bg-panel px-3 text-title text-paper placeholder:text-muted"
        />
      </header>

      <div className="flex-1 overflow-y-auto px-4">
        {results && (
          <p className="pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            {results.length} result{results.length === 1 ? '' : 's'}
          </p>
        )}

        {showing.length === 0 ? (
          <EmptyState
            message={query.trim() ? 'Nothing matches.' : 'No notes yet. Jot something down.'}
            actionLabel="New note"
            onAction={() => void handleNewNote()}
          />
        ) : (
          <ul className="flex flex-col gap-3 pb-4">
            {showing.map((entry) => (
              <li key={entry.id}>
                {entry.type === 'note' ? (
                  <NoteCard note={entry} />
                ) : (
                  <div className="rounded border border-rule p-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                      {TYPE_LABEL[entry.type]}
                    </span>
                    <p className="text-title text-paper">{entry.title}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {!results && (
        <button
          type="button"
          onClick={() => void handleNewNote()}
          className="min-h-[44px] border-t border-rule bg-panel text-title text-muted"
        >
          New note
        </button>
      )}

      <BottomNav />
    </div>
  );
}
