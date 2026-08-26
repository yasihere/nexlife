import { useSyncExternalStore } from 'react';
import { current, replace, subscribe, type Screen } from '../lib/nav';

const TABS: { screen: Screen; label: string }[] = [
  { screen: 'today', label: 'Today' },
  { screen: 'plan', label: 'Plan' },
  { screen: 'review', label: 'Review' },
  { screen: 'settings', label: 'Settings' },
];

export default function BottomNav() {
  const active = useSyncExternalStore(subscribe, current);

  return (
    <nav
      className="flex border-t border-rule bg-panel"
      style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
    >
      {TABS.map(({ screen, label }) => {
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
    </nav>
  );
}
