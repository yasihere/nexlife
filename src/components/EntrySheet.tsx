import { useState } from 'react';
import { complete, drop } from '../data/entries';
import { updateOccurrence } from '../data/series';
import { hapticTick } from '../lib/native';
import { todayKey } from '../lib/time';
import type { Entry, Recurrence } from '../data/types';
import SubtaskList from './SubtaskList';
import AttachedNotes from './AttachedNotes';
import RecurrenceEditor, { type RepeatDraft } from './RecurrenceEditor';

interface EntrySheetProps {
  entry: Entry;
  onClose: () => void;
}

const PRIORITY_LABEL = ['None', 'Low', 'Med', 'High'] as const;
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function ordinal(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'st';
  if (n % 10 === 2 && n % 100 !== 12) return 'nd';
  if (n % 10 === 3 && n % 100 !== 13) return 'rd';
  return 'th';
}

function describeRecurrence(rule: Recurrence): string {
  if (rule.kind === 'daily') return rule.every === 1 ? 'Repeats daily' : `Repeats every ${rule.every} days`;
  if (rule.kind === 'weekly') {
    const days = rule.weekdays.map((d) => WEEKDAY_LABELS[d]).join(', ');
    return rule.every === 1 ? `Repeats weekly on ${days}` : `Repeats every ${rule.every} weeks on ${days}`;
  }
  if (rule.kind === 'monthly') {
    const day = `${rule.dayOfMonth}${ordinal(rule.dayOfMonth)}`;
    return rule.every === 1 ? `Repeats monthly on the ${day}` : `Repeats every ${rule.every} months on the ${day}`;
  }
  return `${rule.count}x a week`;
}

function buildRecurrence(draft: RepeatDraft, startDay: string): Recurrence {
  if (draft.kind === 'daily') return { kind: 'daily', every: draft.every, startDay };
  if (draft.kind === 'weekly') {
    return { kind: 'weekly', every: draft.every, weekdays: draft.weekdays, startDay };
  }
  return { kind: 'monthly', every: draft.every, dayOfMonth: draft.dayOfMonth, startDay };
}

/** Tap an entry title bar, hold to open this (see EntryRow's long-press). */
export default function EntrySheet({ entry, onClose }: EntrySheetProps) {
  const [title, setTitle] = useState(entry.title);
  const [tags, setTags] = useState<string[]>(entry.tags);
  const [tagDraft, setTagDraft] = useState('');
  const [priority, setPriority] = useState<0 | 1 | 2 | 3>(entry.priority);
  const [energy, setEnergy] = useState<'low' | 'med' | 'high' | undefined>(entry.energy);
  const [repeatDraft, setRepeatDraft] = useState<RepeatDraft | null>(null);
  const [confirmingScope, setConfirmingScope] = useState(false);

  const isRecurring = !!entry.seriesId;

  function addTag(): void {
    const t = tagDraft.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagDraft('');
  }

  function buildChanges(): Partial<Entry> {
    const changes: Partial<Entry> = { title: title.trim() || entry.title, tags, priority, energy };
    if (repeatDraft && !isRecurring) {
      changes.recurrence = buildRecurrence(repeatDraft, entry.dayKey ?? todayKey());
      changes.seriesId = entry.id;
    }
    return changes;
  }

  async function commit(scope: 'this' | 'future'): Promise<void> {
    await updateOccurrence(entry, buildChanges(), scope);
    onClose();
  }

  function handleSave(): void {
    if (isRecurring) setConfirmingScope(true);
    else void commit('this');
  }

  async function handleDrop(): Promise<void> {
    await drop(entry.id);
    void hapticTick();
    onClose();
  }

  return (
    <div className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto p-4">
      <h2 className="text-heading text-paper">Edit task</h2>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="min-h-[44px] rounded border border-rule bg-void px-3 text-title text-paper"
      />

      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Priority</span>
        <div className="flex gap-2">
          {([0, 1, 2, 3] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setPriority(level)}
              className={
                'min-h-[44px] flex-1 rounded border text-[11px] font-semibold uppercase tracking-[0.08em] ' +
                (priority === level ? 'border-paper text-paper' : 'border-rule text-muted')
              }
            >
              {PRIORITY_LABEL[level]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Energy</span>
        <div className="flex gap-2">
          {(['low', 'med', 'high'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setEnergy(energy === level ? undefined : level)}
              className={
                'min-h-[44px] flex-1 rounded border text-[11px] font-semibold uppercase tracking-[0.08em] ' +
                (energy === level ? 'border-paper text-paper' : 'border-rule text-muted')
              }
            >
              {level}
            </button>
          ))}
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

      {!entry.parentId && (
        <SubtaskList
          parentId={entry.id}
          parentCompleted={!!entry.completedAt}
          onCompleteParent={() => {
            void complete(entry.id);
            void hapticTick();
          }}
        />
      )}

      {!entry.parentId && <AttachedNotes parentId={entry.id} />}

      {!entry.parentId && (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Recurrence</span>
          {isRecurring ? (
            <p className="text-title text-muted">
              {entry.recurrence ? describeRecurrence(entry.recurrence) : 'Part of a repeating series'}
            </p>
          ) : (
            <RecurrenceEditor value={repeatDraft} onChange={setRepeatDraft} />
          )}
        </div>
      )}

      {confirmingScope ? (
        <div className="flex flex-col gap-2">
          <p className="text-title text-muted">Apply to:</p>
          <button
            type="button"
            onClick={() => void commit('this')}
            className="min-h-[44px] rounded bg-signal text-title font-medium text-void"
          >
            This occurrence
          </button>
          <button
            type="button"
            onClick={() => void commit('future')}
            className="min-h-[44px] rounded border border-rule text-title text-paper"
          >
            This and all future
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSave}
          className="min-h-[44px] rounded bg-signal text-title font-medium text-void"
        >
          Save
        </button>
      )}

      <button type="button" onClick={() => void handleDrop()} className="min-h-[44px] text-title text-muted">
        Drop
      </button>
    </div>
  );
}
