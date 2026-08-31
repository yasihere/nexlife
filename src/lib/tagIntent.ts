// Passes which #tag to show to TagView.tsx without expanding nav.ts's Screen
// union with per-screen params — same subscribe/current shape as nav.ts and
// launchIntent.ts. Zero React imports.

let activeTag: string | null = null;
const listeners = new Set<() => void>();

export function setActiveTag(tag: string): void {
  activeTag = tag;
  for (const listener of listeners) listener();
}

export function getActiveTag(): string | null {
  return activeTag;
}

export function subscribeActiveTag(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
