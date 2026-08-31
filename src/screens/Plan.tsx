import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getByDayRange } from '../data/queries';
import { update } from '../data/entries';
import { weekDayKeys } from '../lib/weekAggregation';
import { todayKey, addDays } from '../lib/time';
import BottomNav from '../components/BottomNav';
import PlanColumn from '../components/PlanColumn';
import type { Entry } from '../data/types';

interface DragGhost {
  entry: Entry;
  x: number;
  y: number;
}

/** The week's shape — density + counts, drag to reschedule (PROMPTS.md Phase
 *  12, #1). Read-mostly otherwise: no tap-to-edit, no quick-add here. */
export default function Plan() {
  const today = todayKey();
  const [weekOffset, setWeekOffset] = useState(0);
  const [ghost, setGhost] = useState<DragGhost | null>(null);
  const columnRefs = useRef(new Map<string, HTMLDivElement>());

  const anchorDay = addDays(today, weekOffset * 7);
  const days = weekDayKeys(anchorDay);
  const [fromDay, toDay] = [days[0], days[6]];

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

  return (
    <div className="mx-auto flex h-dvh max-w-[430px] flex-col bg-void">
      <header className="flex items-center justify-between px-4 pb-3 pt-[max(16px,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => setWeekOffset((w) => w - 1)}
          className="min-h-[44px] min-w-[44px] text-title text-muted"
        >
          ‹
        </button>
        <h1 className="text-heading text-paper">{weekOffset === 0 ? 'This week' : weekLabel}</h1>
        <button
          type="button"
          onClick={() => setWeekOffset((w) => w + 1)}
          className="min-h-[44px] min-w-[44px] text-title text-muted"
        >
          ›
        </button>
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
