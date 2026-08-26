import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yasihere.nexlife',
  appName: 'NexLife',
  webDir: 'dist',
  // No `server.url` — the WebView loads the bundle from android/app/src/main/assets/public
  // (populated by `cap sync`), never over the network. This is what "fully bundled
  // offline" means in Capacitor: omit server entirely rather than pointing at a URL.
  backgroundColor: '#10141C', // --void — shown for the instant before the WebView paints
  android: {
    backgroundColor: '#10141C',
    // Local assets are served over a synthetic https://localhost origin, not file://,
    // so relative asset paths (e.g. /fonts/InterVariable.woff2) resolve exactly as they
    // do in the Phase 0 browser dev build. This is the default — set explicitly so it's
    // not silently relied on.
    allowMixedContent: false,
  },
};

export default config;
