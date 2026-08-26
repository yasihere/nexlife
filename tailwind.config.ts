import type { Config } from 'tailwindcss';

// Tailwind consumes the tokens defined in src/styles/tokens.css — it does not
// define its own palette. Every color below is a var() reference so light/dark
// switching happens in CSS, with zero JS and zero class-name changes.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      void: 'var(--void)',
      panel: 'var(--panel)',
      rule: 'var(--rule)',
      paper: 'var(--paper)',
      muted: 'var(--muted)',
      signal: 'var(--signal)',
    },
    spacing: {
      0: '0px',
      1: 'var(--sp)',
      2: 'calc(var(--sp) * 2)',
      3: 'calc(var(--sp) * 3)',
      4: 'calc(var(--sp) * 4)',
      5: 'calc(var(--sp) * 5)',
      6: 'calc(var(--sp) * 6)',
      8: 'calc(var(--sp) * 8)',
      10: 'calc(var(--sp) * 10)',
      12: 'calc(var(--sp) * 12)',
      16: 'calc(var(--sp) * 16)',
      20: 'calc(var(--sp) * 20)',
      24: 'calc(var(--sp) * 24)',
    },
    borderRadius: {
      none: '0px',
      DEFAULT: 'var(--r)',
      full: '9999px',
    },
    fontFamily: {
      sans: ['InterVariable', 'system-ui', 'sans-serif'],
    },
    extend: {
      fontSize: {
        label: ['11px', { lineHeight: '1', letterSpacing: '0.08em', fontWeight: '600' }],
        title: ['16px', { lineHeight: '1.35', fontWeight: '450' }],
        heading: ['22px', { lineHeight: '1.2', fontWeight: '700' }],
      },
    },
  },
  plugins: [],
} satisfies Config;
