import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import NowLine from './components/NowLine';
import EntryRow from './components/EntryRow';
import BottomNav from './components/BottomNav';

const ROW_HEIGHT = 64; // px per hour
const GUTTER = 64; // px — hour-label column, wide enough for "12:27 PM"
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Placeholder rows. Real entries arrive from src/data/entries.ts in Phase 2 —
// this shell only needs to prove the grid and the Now Line read correctly.
const DUMMY_ENTRIES = [
  { title: 'Morning run', startMin: 6 * 60 + 30, estimateMin: 30, completed: true },
  { title: 'Reply to invoices', startMin: 9 * 60, estimateMin: 45, completed: false },
  { title: 'Design review call', startMin: 15 * 60, estimateMin: 60, completed: false },
];

export default function App() {
  const [now] = useState(() => new Date());
  const gridRef = useRef<HTMLDivElement>(null);

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowTop = (nowMin / 60) * ROW_HEIGHT;
  const remaining = DUMMY_ENTRIES.filter((e) => !e.completed).length;
  const progress = (DUMMY_ENTRIES.length - remaining) / DUMMY_ENTRIES.length;

  // Open on the current time rather than midnight — a phone screen can't show
  // all 24 hours at once.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    grid.scrollTop = Math.max(0, nowTop - grid.clientHeight / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto flex h-dvh max-w-[430px] flex-col bg-void">
      <header className="px-4 pb-3 pt-[max(16px,env(safe-area-inset-top))]">
        <h1 className="text-heading text-paper">{format(now, 'EEEE, MMM d')}</h1>
        <p className="tabular-nums mt-1 text-sm text-muted">{remaining} remaining</p>
        <div className="mt-2 h-px w-full bg-rule">
          <div className="h-px bg-paper/60" style={{ width: `${progress * 100}%` }} />
        </div>
      </header>

      <div ref={gridRef} className="relative flex-1 overflow-y-auto px-4">
        <div className="relative" style={{ height: HOURS.length * ROW_HEIGHT }}>
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute inset-x-0 border-t border-rule"
              style={{ top: hour * ROW_HEIGHT }}
            >
              <span
                className="tabular-nums absolute -top-[6px] whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.08em] text-muted"
                style={{ width: GUTTER - 8 }}
              >
                {format(new Date(0, 0, 0, hour), 'h a')}
              </span>
            </div>
          ))}

          {DUMMY_ENTRIES.map((entry) => (
            <EntryRow
              key={entry.title}
              title={entry.title}
              time={format(new Date(0, 0, 0, 0, entry.startMin), 'h:mm a')}
              top={(entry.startMin / 60) * ROW_HEIGHT}
              height={Math.max((entry.estimateMin / 60) * ROW_HEIGHT, 40)}
              left={GUTTER}
              completed={entry.completed}
              overdue={entry.startMin < nowMin && !entry.completed}
            />
          ))}

          <NowLine top={nowTop} gutter={GUTTER} label={format(now, 'h:mm a')} />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
