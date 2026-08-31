import { useSyncExternalStore } from 'react';
import { current, replace, subscribe, type Screen } from '../lib/nav';
import Sheet from './Sheet';

const ROWS: { screen: Screen; label: string; hint: string }[] = [
  { screen: 'notes', label: 'Notes', hint: 'Free-form notes and search' },
  { screen: 'goals', label: 'Goals', hint: 'Weekly, monthly, yearly, long-term targets' },
  { screen: 'settings', label: 'Settings', hint: 'Backup, day-start hour, preferences' },
];

interface MoreSheetProps {
  open: boolean;
  onClose: () => void;
}

/** Overflow list for the bottom nav's lower-frequency screens (BottomNav.tsx). */
export default function MoreSheet({ open, onClose }: MoreSheetProps) {
  const active = useSyncExternalStore(subscribe, current);

  function go(screen: Screen): void {
    replace(screen);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="flex flex-col p-2">
        <h2 className="px-3 pb-2 pt-3 text-heading text-paper">More</h2>
        {ROWS.map(({ screen, label, hint }) => {
          const isActive = screen === active;
          return (
            <button
              key={screen}
              type="button"
              onClick={() => go(screen)}
              className={
                'flex min-h-[44px] flex-col justify-center gap-0.5 rounded px-3 py-2 text-left ' +
                (isActive ? 'bg-void' : '')
              }
            >
              <span className="text-title text-paper">{label}</span>
              <span className="text-[13px] text-muted">{hint}</span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
