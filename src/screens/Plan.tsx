import { useRef, useState } from 'react';
import { format } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import { getByDayRange } from '../data/queries';
import { update } from '../data/entries';
import { weekDayKeys } from '../lib/weekAggregation';
import { todayKey, addDays, parseDayKey } from '../lib/time';
import BottomNav from '../components/BottomNav';
import PlanColumn from '../components/PlanColumn';
import type { Entry } from '../data/types';

type View = 'day' | 'week';

interface DragGhost {
  entry: Entry;
  x: number;
  y: number;
}

/**
 * Defaults to a single day — a full 7-column week is the congested case
 * (every title clipped to fit a ~50px-wide sliver) and most look-ins are "what's
 * today/tomorrow", not "what's the week's shape". Week is one tap away for when
 * the shape itself (density, drag-to-reschedule across days) is what's wanted.
 * Read-mostly otherwise: no tap-to-edit, no quick-add here.
 */
export default function Plan() {
  const today = todayKey();
  const [view, setView] = useState<View>('day');
  const [dayOffset, setDayOffset] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [ghost, setGhost] = useState<DragGhost | null>(null);
  const columnRefs = useRef(new Map<string, HTMLDivElement>());

  const selectedDay = addDays(today, dayOffset);
  const anchorDay = addDays(today, weekOffset * 7);
  const days = view === 'day' ? [selectedDay] : weekDayKeys(anchorDay);
  const [fromDay, toDay] = [days[0], days[days.length - 1]];

  const weekTasks = useLiveQuery(() => getByDayRange(fromDay, toDay), [fromDay, toDay]) ?? [];
  const activeTasks = weekTasks.filter((e) => !e.droppedAt);

  function registerColumn(day: string) {
    return (el: HTMLDivElement | null) => {
      if (el) columnRefs.current.set(day, el);
      else columnRefs.current.delete(day);
    };
  }

  function hitTest(x: number, y: number): string | null {
    for (const [day, el] of columnRefs.current) {
      const rect = el.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return day;
    }
    return null;
  }

  function handleDragUpdate(entry: Entry | null, x: number, y: number): void {
    setGhost(entry ? { entry, x, y } : null);
  }

  function handleDrop(entry: Entry, x: number, y: number): void {
    setGhost(null);
    const targetDay = hitTest(x, y);
    if (targetDay && targetDay !== entry.dayKey) {
      void update(entry.id, { dayKey: targetDay });
    }
  }

  const dropTargetDay = ghost ? hitTest(ghost.x, ghost.y) : null;
  const weekLabel = `${fromDay.slice(5)} – ${toDay.slice(5)}`;
  const dayLabel = format(parseDayKey(selectedDay), 'EEEE, MMM d');
  const title = view === 'day' ? (dayOffset === 0 ? 'Today' : dayLabel) : weekOffset === 0 ? 'This week' : weekLabel;

  function goPrev(): void {
    if (view === 'day') setDayOffset((d) => d - 1);
    else setWeekOffset((w) => w - 1);
  }

  function goNext(): void {
    if (view === 'day') setDayOffset((d) => d + 1);
    else setWeekOffset((w) => w + 1);
  }

  return (
    <div className="mx-auto flex h-dvh max-w-[430px] flex-col bg-void">
      <header className="px-4 pt-[max(16px,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between pb-3">
          <button type="button" onClick={goPrev} className="min-h-[44px] min-w-[44px] text-title text-muted">
            ‹
          </button>
          <h1 className="text-heading text-paper">{title}</h1>
          <button type="button" onClick={goNext} className="min-h-[44px] min-w-[44px] text-title text-muted">
            ›
          </button>
        </div>
        <div className="flex gap-2 pb-3">
          {(['day', 'week'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={
                'min-h-[44px] flex-1 rounded border text-[11px] font-semibold uppercase tracking-[0.08em] ' +
                (view === v ? 'border-paper text-paper' : 'border-rule text-muted')
              }
            >
              {v === 'day' ? 'Day' : 'Week'}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <div className="flex gap-1">
          {days.map((day) => (
            <PlanColumn
              key={day}
              day={day}
              entries={activeTasks.filter((e) => e.dayKey === day)}
              isToday={day === today}
              isPast={day < today}
              isDropTarget={day === dropTargetDay}
              columnRef={registerColumn(day)}
              onDragUpdate={handleDragUpdate}
              onDrop={handleDrop}
              showHeader={view === 'week'}
            />
          ))}
        </div>
      </div>

      {ghost && (
        <div
          style={{ position: 'fixed', left: ghost.x - 48, top: ghost.y - 16, zIndex: 50, pointerEvents: 'none' }}
          className="max-w-[96px] truncate rounded border border-rule bg-panel px-2 py-1 text-[11px] text-paper"
        >
          {ghost.entry.title}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
