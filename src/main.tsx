import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App as CapacitorApp } from '@capacitor/app';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { wireHardwareBackButton, replace } from './lib/nav';
import { setPendingAddTask } from './lib/launchIntent';
import { wireNotificationTaps } from './lib/notifications';
import './styles/index.css';

wireHardwareBackButton();

// Launcher shortcuts (PROMPTS.md Phase 8, #6) arrive as a custom-scheme deep
// link — see android/app/src/main/res/xml/shortcuts.xml — rather than a
// custom native plugin; Capacitor's App plugin already handles this, via two
// different paths depending on whether the app was already running:
function handleLaunchUrl(url: string | undefined | null): void {
  if (!url) return;
  const path = url.replace(/^[^:]+:\/\//, ''); // strip "scheme://"
  if (path === 'add') setPendingAddTask();
  // path === 'today' needs no handling — Today is already the default screen.
}

// Warm relaunch — the process is already alive (e.g. Android reuses the
// singleTask activity) and a new intent arrives while JS is running.
CapacitorApp.addListener('appUrlOpen', (data: { url: string }) => handleLaunchUrl(data.url));

// Cold launch — the very first launch's URL isn't guaranteed to also fire
// appUrlOpen before this script runs, so it has to be asked for explicitly.
void CapacitorApp.getLaunchUrl().then((launch) => handleLaunchUrl(launch?.url));

void wireNotificationTaps(() => replace('today'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
