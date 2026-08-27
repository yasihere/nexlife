// One shared "now", ticking once a minute — CLAUDE.md §5: "It updates once per
// minute from one shared interval, not one per component." Same subscribe/current
// shape as src/lib/nav.ts, so screens consume it the same way, via
// useSyncExternalStore. Zero React imports.

let value = Date.now();
const listeners = new Set<() => void>();
let started = false;

function tick(): void {
  value = Date.now();
  for (const listener of listeners) listener();
}

// Align the first tick to the next minute boundary, then run every 60s exactly —
// otherwise the Now Line would drift a few seconds behind the wall clock over time.
function ensureStarted(): void {
  if (started) return;
  started = true;
  const msToNextMinute = 60_000 - (Date.now() % 60_000);
  setTimeout(() => {
    tick();
    setInterval(tick, 60_000);
  }, msToNextMinute);
}

/** The current timestamp, refreshed at most once a minute. */
export function now(): number {
  ensureStarted();
  return value;
}

/** Subscribe to minute ticks. Returns an unsubscribe function. */
export function subscribeNow(listener: () => void): () => void {
  ensureStarted();
  listeners.add(listener);
  return () => listeners.delete(listener);
}
