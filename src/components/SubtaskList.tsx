import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getChildren, create, complete, uncomplete } from '../data/entries';

interface SubtaskListProps {
  parentId: string;
  parentCompleted: boolean;
  onCompleteParent: () => void;
}

/**
 * Children of a subtask parent, in the entry sheet. Completing every child
 * does NOT auto-complete the parent — it surfaces a plain "Complete" button
 * instead (PROMPTS.md Phase 6, #2: "prompt me subtly instead").
 */
export default function SubtaskList({ parentId, parentCompleted, onCompleteParent }: SubtaskListProps) {
  const [newTitle, setNewTitle] = useState('');
  const children = useLiveQuery(() => getChildren(parentId), [parentId]) ?? [];
  const done = children.filter((c) => !!c.completedAt).length;
  const allDone = children.length > 0 && done === children.length;

  async function handleAdd(): Promise<void> {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    await create({ type: 'task', title: trimmed, parentId });
    setNewTitle('');
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Subtasks</span>
        {children.length > 0 && (
          <span className="tabular-nums text-[11px] text-muted">
            {done}/{children.length}
          </span>
        )}
      </div>

      {allDone && !parentCompleted && (
        <div className="flex items-center justify-between rounded border border-rule px-3 py-2">
          <span className="text-title text-paper">All {children.length} subtasks done.</span>
          <button type="button" onClick={onCompleteParent} className="text-title text-paper underline">
            Complete
          </button>
        </div>
      )}

      {children.length > 0 && (
        <ul className="flex flex-col gap-2">
          {children.map((child) => (
            <li key={child.id}>
              <button
                type="button"
                onClick={() => void (child.completedAt ? uncomplete(child.id) : complete(child.id))}
                className="flex min-h-[44px] w-full items-center rounded bg-panel px-3 text-left transition-opacity duration-[120ms]"
                style={{ opacity: child.completedAt ? 0.35 : 1 }}
              >
                <span
                  className="block w-full truncate text-title text-paper"
                  style={{ textDecoration: child.completedAt ? 'line-through' : 'none' }}
                >
                  {child.title}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void handleAdd();
            }
          }}
          placeholder="Add subtask"
          className="min-h-[44px] flex-1 rounded border border-rule bg-void px-3 text-title text-paper placeholder:text-muted"
        />
        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={!newTitle.trim()}
          className="min-h-[44px] rounded border border-rule px-4 text-title text-paper disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}
