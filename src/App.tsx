import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { subscribe, current, replace } from './lib/nav';
import { getOverdue } from './data/queries';
import { getSettings } from './data/settings';
import { todayKey } from './lib/time';

// Route-split every screen (CLAUDE.md §6) — each is its own chunk, fetched
// only when actually shown. Report bundle before/after per PROMPTS.md Phase 8.
const Today = lazy(() => import('./screens/Today'));
const Triage = lazy(() => import('./screens/Triage'));
const Settings = lazy(() => import('./screens/Settings'));
const Log = lazy(() => import('./screens/Log'));
const Notes = lazy(() => import('./screens/Notes'));
const Plan = lazy(() => import('./screens/Plan'));
const Review = lazy(() => import('./screens/Review'));
const Goals = lazy(() => import('./screens/Goals'));
const TagView = lazy(() => import('./screens/TagView'));

// Same background as the gate's own loading frame — a lazy chunk still
// fetching should never show a blank or mismatched-colour flash.
const screenFallback = <div className="h-dvh bg-void" />;

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

  if (!gateResolved) return screenFallback;

  return (
    <Suspense fallback={screenFallback}>
      {(() => {
        switch (screen) {
          case 'triage':
            return <Triage onDone={() => replace('today')} />;
          case 'settings':
            return <Settings />;
          case 'log':
            return <Log />;
          case 'notes':
            return <Notes />;
          case 'plan':
            return <Plan />;
          case 'review':
            return <Review />;
          case 'goals':
            return <Goals />;
          case 'tag':
            return <TagView />;
          default:
            return <Today />;
        }
      })()}
    </Suspense>
  );
}
