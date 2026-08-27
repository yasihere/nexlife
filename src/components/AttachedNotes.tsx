import { useLiveQuery } from 'dexie-react-hooks';
import { getChildren } from '../data/queries';
import { create } from '../data/entries';
import NoteCard from './NoteCard';

interface AttachedNotesProps {
  parentId: string;
}

/** Notes attached to an entry via parentId (PROMPTS.md Phase 11) — the same
 *  relationship subtasks use, filtered to type: 'note' so the two lists never
 *  bleed into each other (see getChildren's type parameter). */
export default function AttachedNotes({ parentId }: AttachedNotesProps) {
  const notes = useLiveQuery(() => getChildren(parentId, 'note'), [parentId]) ?? [];

  async function handleAdd(): Promise<void> {
    await create({ type: 'note', title: 'Note', body: '', tags: [], parentId });
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Notes</span>
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
      <button
        type="button"
        onClick={() => void handleAdd()}
        className="min-h-[44px] rounded border border-rule text-title text-paper"
      >
        Add note
      </button>
    </div>
  );
}
