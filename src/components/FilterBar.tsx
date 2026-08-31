import { useState, type ReactNode } from 'react';
import Sheet from './Sheet';
import type { Entry } from '../data/types';

export interface Filters {
  energy: 'low' | 'med' | 'high' | null;
  /** Minutes available — "what can I do right now" (PROMPTS.md Phase 6, #4). */
  timeAvailable: 15 | 30 | 60 | null;
  tags: string[];
}

export const EMPTY_FILTERS: Filters = { energy: null, timeAvailable: null, tags: [] };

/**
 * Whether `entry` survives the current filters. A time-available filter only
 * matches entries with a known estimateMin at or under it — an entry with no
 * estimate is an unknown, not a fit, so a "what fits in 15 minutes" filter
 * shouldn't silently include it.
 */
export function matchesFilters(entry: Entry, filters: Filters): boolean {
  if (filters.energy && entry.energy !== filters.energy) return false;
  if (filters.timeAvailable != null) {
    if (entry.estimateMin == null || entry.estimateMin > filters.timeAvailable) return false;
  }
  if (filters.tags.length > 0 && !filters.tags.some((t) => entry.tags.includes(t))) return false;
  return true;
}

function activeCount(filters: Filters): number {
  return (filters.energy ? 1 : 0) + (filters.timeAvailable != null ? 1 : 0) + filters.tags.length;
}

interface ToggleProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}

function Toggle({ active, onClick, children }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'min-h-[44px] whitespace-nowrap rounded border px-3 text-[11px] font-semibold uppercase tracking-[0.08em] ' +
        (active ? 'border-paper text-paper' : 'border-rule text-muted')
      }
    >
      {children}
    </button>
  );
}

interface FilterSectionProps {
  label: string;
  children: ReactNode;
}

function FilterSection({ label, children }: FilterSectionProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

interface FilterBarProps {
  availableTags: string[];
  filters: Filters;
  onChange: (filters: Filters) => void;
}

/**
 * A single trigger that opens a sheet holding Today's filters, each in its
 * own clearly labeled section — Energy, Time available, Tags. Previously one
 * unlabeled, horizontally-scrolling row mixed all three together (an energy
 * chip like "high" sitting next to an unlabeled #tag chip, with nothing on
 * screen explaining why a tag was there at all). Collapsed by default: Today
 * stays calm, filtering is a deliberate action via the trigger, not a
 * permanent fixture competing with the grid for attention.
 */
export default function FilterBar({ availableTags, filters, onChange }: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const count = activeCount(filters);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          'flex min-h-[44px] shrink-0 items-center gap-1.5 rounded border px-3 text-[11px] font-semibold ' +
          'uppercase tracking-[0.08em] ' +
          (count > 0 ? 'border-paper text-paper' : 'border-rule text-muted')
        }
      >
        Filters{count > 0 ? ` · ${count}` : ''}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)}>
        <div className="flex max-h-[85vh] flex-col gap-5 overflow-y-auto p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-heading text-paper">Filters</h2>
            {count > 0 && (
              <button
                type="button"
                onClick={() => onChange(EMPTY_FILTERS)}
                className="min-h-[44px] text-title text-muted underline"
              >
                Clear all
              </button>
            )}
          </div>

          <FilterSection label="Energy">
            {(['low', 'med', 'high'] as const).map((level) => (
              <Toggle
                key={level}
                active={filters.energy === level}
                onClick={() => onChange({ ...filters, energy: filters.energy === level ? null : level })}
              >
                {level}
              </Toggle>
            ))}
          </FilterSection>

          <FilterSection label="Time available">
            {([15, 30, 60] as const).map((mins) => (
              <Toggle
                key={mins}
                active={filters.timeAvailable === mins}
                onClick={() =>
                  onChange({ ...filters, timeAvailable: filters.timeAvailable === mins ? null : mins })
                }
              >
                {mins}m
              </Toggle>
            ))}
          </FilterSection>

          {availableTags.length > 0 && (
            <FilterSection label="Tags">
              {availableTags.map((tag) => {
                const active = filters.tags.includes(tag);
                return (
                  <Toggle
                    key={tag}
                    active={active}
                    onClick={() =>
                      onChange({
                        ...filters,
                        tags: active ? filters.tags.filter((t) => t !== tag) : [...filters.tags, tag],
                      })
                    }
                  >
                    #{tag}
                  </Toggle>
                );
              })}
            </FilterSection>
          )}
        </div>
      </Sheet>
    </>
  );
}
