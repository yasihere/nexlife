import { useState, useSyncExternalStore } from 'react';
import { current, replace, subscribe, type Screen } from '../lib/nav';
import MoreSheet from './MoreSheet';

const PRIMARY: { screen: Screen; label: string }[] = [
  { screen: 'today', label: 'Today' },
  { screen: 'plan', label: 'Plan' },
  { screen: 'review', label: 'Review' },
  { screen: 'log', label: 'Log' },
];

// Screens reachable only via the More sheet (kept in sync with MoreSheet.tsx's
// own row list) — used here just to decide whether "More" should read active.
const OVERFLOW: Screen[] = ['notes', 'goals', 'settings'];

/**
 * Four primary tabs + More, replacing the old seven-tab row (CLAUDE.md §8
 * phase note: Today/Plan/Review/Log are the daily planning-and-tracking loop;
 * Notes/Goals/Settings are lower-frequency and move into the overflow sheet).
 * Each primary tab now gets ~78px of width on a 390px screen instead of ~55px.
 */
export default function BottomNav() {
  const active = useSyncExternalStore(subscribe, current);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = OVERFLOW.includes(active);

  return (
    <>
      <nav
        className="flex border-t border-rule bg-panel"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
      >
        {PRIMARY.map(({ screen, label }) => {
          const isActive = screen === active;
          return (
            <button
              key={screen}
              type="button"
              onClick={() => replace(screen)}
              className="flex min-h-[44px] flex-1 items-center justify-center py-3"
            >
              <span
                className={
                  'text-[11px] font-semibold uppercase tracking-[0.08em] ' +
                  (isActive ? 'text-paper' : 'text-muted')
                }
              >
                {label}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex min-h-[44px] flex-1 items-center justify-center py-3"
        >
          <span
            className={
              'text-[11px] font-semibold uppercase tracking-[0.08em] ' +
              (moreActive ? 'text-paper' : 'text-muted')
            }
          >
            More
          </span>
        </button>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
