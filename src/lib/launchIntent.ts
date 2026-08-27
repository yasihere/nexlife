// A tiny flag store for "the app was opened via the 'Add task' launcher
// shortcut" (PROMPTS.md Phase 8, #6) — set by main.tsx's appUrlOpen listener
// before React ever mounts, read once by Today on its first render. Same
// subscribe/current shape as lib/nav.ts and lib/clock.ts. Zero React imports.

let pendingAddTask = false;
const listeners = new Set<() => void>();

export function setPendingAddTask(): void {
  pendingAddTask = true;
  for (const listener of listeners) listener();
}

/** Reads and clears the flag in one step — it should only ever fire once. */
export function consumePendingAddTask(): boolean {
  const value = pendingAddTask;
  pendingAddTask = false;
  return value;
}

export function subscribeLaunchIntent(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
