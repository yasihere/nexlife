// Recurrence <-> Entry integration. Zero React imports, and deliberately zero
// direct Dexie access too — this composes entries.ts's primitives with
// recurrence.ts's pure math, keeping entries.ts as the one file that actually
// touches the database (CLAUDE.md §4; settings.ts is the one other, narrower
// exception, for a genuinely distinct concern).

import { create, update } from './entries';
import { getRecurringTemplates, getSeriesOccurrences, getTemplateForSeries } from './queries';
import { expandSeries } from './recurrence';
import type { Entry } from './types';

/**
 * Ensures every recurring series due on `dayKey` has a materialised occurrence
 * for it. Call before reading a day's entries (Today.tsx does, once per day
 * shown) — never eagerly, and never more than the one day actually needed
 * (SPEC.md: "materialised lazily for the visible window only").
 */
export async function materializeDueOccurrences(dayKey: string): Promise<void> {
  const templates = await getRecurringTemplates();

  for (const template of templates) {
    if (!template.recurrence) continue;
    const due = expandSeries(template.recurrence, dayKey, dayKey);
    if (due.length === 0) continue;

    const seriesId = template.seriesId ?? template.id;
    const occurrences = await getSeriesOccurrences(seriesId);
    // The template's own row should always carry seriesId === its own id (every
    // creation path does this), which would make it show up in `occurrences`
    // too — but checking `template.dayKey` directly as well costs nothing and
    // means a future occurrence for the template's own day is never duplicated
    // even if that invariant were ever violated.
    const alreadyExists = template.dayKey === dayKey || occurrences.some((o) => o.dayKey === dayKey);
    if (alreadyExists) continue;

    await create({
      type: 'task',
      title: template.title,
      body: template.body,
      dayKey,
      startMin: template.startMin,
      estimateMin: template.estimateMin,
      seriesId,
      tags: template.tags,
      priority: template.priority,
      energy: template.energy,
    });
  }
}

/**
 * Apply an edit to one occurrence, or propagate it to the template and every
 * already-materialised future occurrence too ("editing asks: this one, or all
 * future?" — PROMPTS.md Phase 6). Scoped to descriptive fields only
 * (title/tags/priority/energy/estimateMin) — never pass dayKey/startMin/
 * recurrence here: a single occurrence's date is Triage/Plan's concern, and
 * changing the rule itself is out of scope for this phase (see chat).
 */
export async function updateOccurrence(
  entry: Entry,
  changes: Partial<Entry>,
  scope: 'this' | 'future'
): Promise<void> {
  await update(entry.id, changes);
  if (scope !== 'future' || !entry.seriesId || !entry.dayKey) return;

  const template = await getTemplateForSeries(entry.seriesId);
  if (template && template.id !== entry.id) {
    await update(template.id, changes);
  }

  const siblings = await getSeriesOccurrences(entry.seriesId);
  for (const sibling of siblings) {
    if (sibling.id === entry.id) continue;
    if (sibling.dayKey && sibling.dayKey > entry.dayKey) {
      await update(sibling.id, changes);
    }
  }
}
