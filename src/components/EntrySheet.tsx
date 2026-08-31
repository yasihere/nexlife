import { useState } from 'react';
import { complete, drop, update } from '../data/entries';
import { updateOccurrence } from '../data/series';
import { describeRecurrence } from '../data/recurrence';
import { hapticTick } from '../lib/native';
import { todayKey, minutesToTimeInput, timeInputToMinutes } from '../lib/time';
import type { Entry, Recurrence } from '../data/types';
import SubtaskList from './SubtaskList';
import AttachedNotes from './AttachedNotes';
import RecurrenceEditor, { type RepeatDraft } from './RecurrenceEditor';

interface EntrySheetProps {
  entry: Entry;
  onClose: () => void;
}

const PRIORITY_LABEL = ['None', 'Low', 'Med', 'High'] as const;

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
  // A weekly repeat with no day picked yet (RecurrenceEditor's own starting
  // state) matches nothing, ever — recurrence.ts now handles that shape
  // safely if it somehow got saved, but Save should just refuse to create it
  // in the first place rather than silently drop the rule.
  const repeatInvalid = !!repeatDraft && repeatDraft.kind === 'weekly' && repeatDraft.weekdays.length === 0;

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

  // Date/time apply immediately, independent of the Save button below — same
  // "acts right away" pattern as Drop, not bundled into buildChanges()/commit().
  // Deliberately always a plain update() on this one entry, never routed
  // through updateOccurrence's "this vs future" scope: a schedule change for
  // one occurrence of a recurring series should never cascade its literal
  // dayKey/startMin onto every future occurrence too (see updateOccurrence's
  // own comment on why it only ever touches descriptive fields). Moving
  // where a whole series happens next is still Triage/Plan's job, unchanged.
  async function handleDateChange(value: string): Promise<void> {
    if (!value) return; // the date field can't itself go empty — pick "no time" for that
    await update(entry.id, { dayKey: value });
  }

  async function handleTimeChange(value: string): Promise<void> {
    const startMin = timeInputToMinutes(value);
    const changes: Partial<Entry> = { startMin };
    // An unscheduled task (no dayKey yet) that gets a time picked before a
    // date needs one anyway — startMin with no dayKey is invisible everywhere
    // (Today's grid keys off dayKey first), so default it to today rather
    // than silently storing a time nothing will ever show.
    if (startMin != null && !entry.dayKey) changes.dayKey = todayKey();
    await update(entry.id, changes);
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
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">When</span>
        <div className="flex gap-2">
          <input
            type="date"
            value={entry.dayKey ?? ''}
            onChange={(e) => void handleDateChange(e.target.value)}
            className="tabular-nums min-h-[44px] flex-1 rounded border border-rule bg-void px-3 text-title text-paper"
          />
          <input
            type="time"
            value={minutesToTimeInput(entry.startMin)}
            onChange={(e) => void handleTimeChange(e.target.value)}
            className="tabular-nums min-h-[44px] w-[124px] rounded border border-rule bg-void px-3 text-title text-paper"
          />
        </div>
        {entry.startMin != null && (
          <button
            type="button"
            onClick={() => void handleTimeChange('')}
            className="min-h-[44px] self-start text-title text-muted underline"
          >
            No time — Unscheduled
          </button>
        )}
      </div>

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
          disabled={repeatInvalid}
          className="min-h-[44px] rounded bg-signal text-title font-medium text-void disabled:opacity-40"
        >
          {repeatInvalid ? 'Pick a day to repeat on' : 'Save'}
        </button>
      )}

      <button type="button" onClick={() => void handleDrop()} className="min-h-[44px] text-title text-muted">
        Drop
      </button>
    </div>
  );
}
