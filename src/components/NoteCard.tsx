import { useState } from 'react';
import { update } from '../data/entries';
import { toggleCheckboxLine } from '../lib/noteFormat';
import NoteBody from './NoteBody';
import type { Entry } from '../data/types';

interface NoteCardProps {
  note: Entry;
}

/**
 * Tap to edit (plain textarea, raw syntax), tap "Done" to render (PROMPTS.md
 * Phase 11's "minimal editor"). Checkboxes stay tappable in the rendered view
 * without entering edit mode — checking things off is the frequent action.
 */
export default function NoteCard({ note }: NoteCardProps) {
  const [editing, setEditing] = useState(!note.body);
  const [draft, setDraft] = useState(note.body ?? '');

  function startEditing(): void {
    setDraft(note.body ?? '');
    setEditing(true);
  }

  async function finishEditing(): Promise<void> {
    await update(note.id, { body: draft });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 rounded border border-rule p-3">
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={6}
          placeholder="# Heading&#10;**bold**&#10;- [ ] checkbox"
          className="w-full resize-none rounded border border-rule bg-void p-2 text-title text-paper placeholder:text-muted"
        />
        <button
          type="button"
          onClick={() => void finishEditing()}
          className="min-h-[44px] rounded bg-signal text-title font-medium text-void"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={startEditing}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && startEditing()}
      className="rounded border border-rule p-3"
    >
      {note.body ? (
        <NoteBody
          body={note.body}
          onToggleCheckbox={(lineIndex) => void update(note.id, { body: toggleCheckboxLine(note.body!, lineIndex) })}
        />
      ) : (
        <p className="text-title text-muted">Empty note. Tap to write.</p>
      )}
    </div>
  );
}
