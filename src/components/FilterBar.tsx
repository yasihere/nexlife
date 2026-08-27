import type { ReactNode } from 'react';
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

interface FilterBarProps {
  availableTags: string[];
  filters: Filters;
  onChange: (filters: Filters) => void;
}

/** Today's filter bar — energy + time-available ("what can I do right now",
 *  the filter that matters) plus simple tag filtering. */
export default function FilterBar({ availableTags, filters, onChange }: FilterBarProps) {
  const anyActive = !!filters.energy || filters.timeAvailable != null || filters.tags.length > 0;

  return (
    <div className="flex flex-col gap-2 overflow-x-auto px-4 pb-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Energy</span>
        {(['low', 'med', 'high'] as const).map((level) => (
          <Toggle
            key={level}
            active={filters.energy === level}
            onClick={() => onChange({ ...filters, energy: filters.energy === level ? null : level })}
          >
            {level}
          </Toggle>
        ))}
        <span className="ml-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Time</span>
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
        {anyActive && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="ml-1 shrink-0 text-[11px] text-muted underline"
          >
            Clear
          </button>
        )}
      </div>

      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
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
        </div>
      )}
    </div>
  );
}
