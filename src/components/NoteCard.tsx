import { useState } from 'react';
import { update } from '../data/entries';
import { toggleCheckboxLine } from '../lib/noteFormat';
import NoteBody from './NoteBody';
import type { Entry } from '../data/types';

interface NoteCardProps {
  note: Entry;
}

// A long note otherwise pushes the whole list down past readability — collapse
// to this many source lines by default (see NoteBody's maxLines comment for
// why lines, not a CSS clamp), expand with its own control so it never fights
// the card's own tap-to-edit gesture.
const PREVIEW_LINES = 4;

/**
 * Tap to edit (plain textarea, raw syntax), tap "Done" to render (PROMPTS.md
 * Phase 11's "minimal editor"). Checkboxes stay tappable in the rendered view
 * without entering edit mode — checking things off is the frequent action.
 */
export default function NoteCard({ note }: NoteCardProps) {
  const [editing, setEditing] = useState(!note.body);
  const [draft, setDraft] = useState(note.body ?? '');
  const [expanded, setExpanded] = useState(false);

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

  const totalLines = note.body ? note.body.split('\n').length : 0;
  const canCollapse = totalLines > PREVIEW_LINES;

  return (
    <div
      onClick={startEditing}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && startEditing()}
      className="rounded border border-rule p-3"
    >
      {note.body ? (
        <>
          <NoteBody
            body={note.body}
            maxLines={!expanded && canCollapse ? PREVIEW_LINES : undefined}
            onToggleCheckbox={(lineIndex) => void update(note.id, { body: toggleCheckboxLine(note.body!, lineIndex) })}
          />
          {canCollapse && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              className="mt-1.5 min-h-[44px] text-[11px] font-semibold uppercase tracking-[0.08em] text-muted"
            >
              {expanded ? 'Show less' : `Show more · ${totalLines - PREVIEW_LINES} more line${totalLines - PREVIEW_LINES === 1 ? '' : 's'}`}
            </button>
          )}
        </>
      ) : (
        <p className="text-title text-muted">Empty note. Tap to write.</p>
      )}
    </div>
  );
}
