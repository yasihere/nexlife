// Hand-rolled screen stack. No router library — see CLAUDE.md §3.
// Zero React imports; screens subscribe via `subscribe` and read via `current`.
// Wired to the Capacitor Android back button below: pop on hardware back, exit the
// app only when the stack is already at its root (Today).

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export type Screen = 'today' | 'plan' | 'review' | 'log' | 'notes' | 'settings' | 'triage';

const stack: Screen[] = ['today'];
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** The screen currently on top of the stack. */
export function current(): Screen {
  return stack[stack.length - 1];
}

/** Push a new screen on top (e.g. opening a detail view). Back returns here. */
export function push(screen: Screen): void {
  stack.push(screen);
  notify();
}

/** Pop the top screen. No-op — and returns false — at the root. */
export function pop(): boolean {
  if (stack.length <= 1) return false;
  stack.pop();
  notify();
  return true;
}

/** Replace the top screen in place (e.g. bottom nav taps) — no history entry. */
export function replace(screen: Screen): void {
  stack[stack.length - 1] = screen;
  notify();
}

/** True when at the root of the stack — hardware back should exit the app here. */
export function atRoot(): boolean {
  return stack.length <= 1;
}

/** Subscribe to stack changes. Returns an unsubscribe function. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Registering a `backButton` listener tells Capacitor's native bridge that JS now
// owns back-press behaviour entirely — it will no longer auto-exit the activity, so
// exiting from the root is our job here, not a default we can rely on.
let backButtonWired = false;

/** Call once at startup. No-op outside a native Android shell (e.g. browser dev). */
export function wireHardwareBackButton(): void {
  if (backButtonWired || !Capacitor.isNativePlatform()) return;
  backButtonWired = true;
  App.addListener('backButton', () => {
    if (!pop()) App.exitApp();
  });
}
