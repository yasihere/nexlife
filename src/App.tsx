import { useEffect, useState, useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Today from './screens/Today';
import Triage from './screens/Triage';
import Settings from './screens/Settings';
import BottomNav from './components/BottomNav';
import { subscribe, current, replace } from './lib/nav';
import { getOverdue } from './data/queries';
import { getSettings } from './data/settings';
import { todayKey } from './lib/time';

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="mx-auto flex h-dvh max-w-[430px] flex-col bg-void">
      <header className="px-4 pb-3 pt-[max(16px,env(safe-area-inset-top))]">
        <h1 className="text-heading text-paper">{title}</h1>
      </header>
      <div className="flex flex-1 items-center justify-center px-8 text-center text-title text-muted">
        Not built yet.
      </div>
      <BottomNav />
    </div>
  );
}

// The gate (Triage-before-Today) resolves once per app-open by pushing nav.ts
// into the 'triage' screen directly, rather than keeping a second, parallel
// piece of screen-selection state — nav.ts's stack is the one source of truth
// for "what's showing" once the gate has had its say.
export default function App() {
  const [gateResolved, setGateResolved] = useState(false);
  const screen = useSyncExternalStore(subscribe, current);
  const today = todayKey();
  const settings = useLiveQuery(() => getSettings());
  const overdue = useLiveQuery(() => getOverdue(today), [today]);

  useEffect(() => {
    if (gateResolved || settings === undefined || overdue === undefined) return;
    setGateResolved(true);
    const dueForTriage = settings.lastTriageDay === undefined || today > settings.lastTriageDay;
    if (dueForTriage && overdue.length > 0) replace('triage');
  }, [gateResolved, settings, overdue, today]);

  if (!gateResolved) return <div className="h-dvh bg-void" />;

  switch (screen) {
    case 'triage':
      return <Triage onDone={() => replace('today')} />;
    case 'settings':
      return <Settings />;
    case 'plan':
      return <ComingSoon title="Plan" />;
    case 'review':
      return <ComingSoon title="Review" />;
    default:
      return <Today />;
  }
}
