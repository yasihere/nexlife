import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Today from './screens/Today';
import Triage from './screens/Triage';
import { getOverdue } from './data/entries';
import { getSettings } from './data/settings';
import { todayKey } from './lib/time';

type Screen = 'checking' | 'triage' | 'today';

// Plan, Review and Settings don't exist yet (later phases) — App otherwise
// is a thin shell around Today, deciding once per app-open whether Triage
// needs to run first (SPEC.md "Triage").
export default function App() {
  const [screen, setScreen] = useState<Screen>('checking');
  const today = todayKey();
  const settings = useLiveQuery(() => getSettings());
  const overdue = useLiveQuery(() => getOverdue(today), [today]);

  // Decide exactly once, when both queries have resolved, then freeze it. If we
  // instead re-derived this on every live-query update, the screen could flicker
  // back to Triage mid-Today-use the moment something else makes an entry
  // overdue — Triage owns its own lifecycle once it's showing.
  useEffect(() => {
    if (screen !== 'checking' || settings === undefined || overdue === undefined) return;
    const dueForTriage = settings.lastTriageDay === undefined || today > settings.lastTriageDay;
    setScreen(dueForTriage && overdue.length > 0 ? 'triage' : 'today');
  }, [screen, settings, overdue, today]);

  if (screen === 'checking') return <div className="h-dvh bg-void" />;
  if (screen === 'triage') return <Triage onDone={() => setScreen('today')} />;
  return <Today />;
}
